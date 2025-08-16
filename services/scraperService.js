const fetch = require('node-fetch');
const { delay, getRandomDelay } = require('../utils/helpers');

class ScraperService {
    constructor() {
        this.TINDER_TOKEN = process.env.TINDER_TOKEN;
        this.BATCH_SIZE = 10;
    }

    async fetchRecommendations() {
        try {
            const res = await fetch("https://api.gotinder.com/v2/recs/core", {
                headers: {
                    "X-Auth-Token": this.TINDER_TOKEN,
                    "User-Agent": "Tinder/13.13.0 (iPhone; iOS 15.0; Scale/3.00)",
                    Accept: "application/json",
                },
            });

            const text = await res.text();
            if (!text.trim()) return [];

            const data = JSON.parse(text);
            return data?.data?.results || [];
        } catch (err) {
            console.error('Scrape error:', err);
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

    async scrapeBatch() {
        const profiles = await this.fetchRecommendations();
        const processed = [];

        for (const p of profiles) {
            const profileData = await this.processProfile(p);
            processed.push(profileData);
            await delay(getRandomDelay(2000, 5000));
        }

        return processed;
    }
}

module.exports = new ScraperService();