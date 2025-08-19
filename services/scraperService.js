const fetch = require('node-fetch');
const { delay, getRandomDelay } = require('../utils/helpers');
const Profile = require('../models/mongo/Profile'); // Update import
class ScraperService {
    constructor() {
        this.TINDER_TOKEN = process.env.TINDER_TOKEN;
        this.BATCH_SIZE = 10;
    }

    async fetchRecommendations(token) {
        try {
            const res = await fetch("https://api.gotinder.com/v2/recs/core", {
                headers: {
                    "X-Auth-Token": token,
                    "User-Agent": "Tinder/13.13.0 (iPhone; iOS 15.0; Scale/3.00)",
                    Accept: "application/json",
                },
            });

            const text = await res.text();
            // If it's empty, just return empty list
            if (!text || text.trim() === "") {
                console.warn("⚠️ Empty response from Tinder API, retrying...");
                return [];
            }


            const data = JSON.parse(text);
            return data?.data?.results || [];
        } catch (err) {
            console.error("❌ Failed to parse JSON:", err.message);

            return [];
        }
    }

    async processProfile(profile) {
        return {
            name: profile.user?.name || 'Unknown',
            age: profile.user?.birth_date
                ? Math.floor((Date.now() - new Date(profile.user.birth_date)) / 3.15576e+10)
                : null,
            distance: profile.distance_mi || null,
            tinderId: profile.user?._id || null,
            imageUrls: profile.user?.photos?.map(photo => photo.url) || []
        };
    }

    async scrapeBatch(token) {
        const profiles = await this.fetchRecommendations(token);
        const processed = [];

        for (const p of profiles) {
            const profileData = await this.processProfile(p);

            // Check for duplicate using MongoDB
            const exists = await Profile.findOne({ tinderId: profileData.tinderId });
            if (exists) {
                console.log(`Skipping duplicate: ${profileData.tinderId}`);
                continue;
            }

            processed.push(profileData);
            await delay(getRandomDelay(2000, 3000));
        }

        return processed;
    }
}

module.exports = new ScraperService();