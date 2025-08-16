const scraperService = require('../services/scraperService');
const recognizer = require('../config/recognizer');
const { Profile, ProfileImage } = require('../models');

let isScraping = false;

module.exports = {
    startScraping: async (req, res) => {
        if (isScraping) {
            return res.status(400).json({ error: 'Scraping already in progress' });
        }

        isScraping = true;
        res.json({ message: 'Scraping started' });

        try {
            while (isScraping) {
                const batch = await scraperService.scrapeBatch();
                for (const profileData of batch) {
                    try {
                        // Save profile to DB
                        const profile = await Profile.create(profileData);

                        // Process and save images
                        for (const imageUrl of profileData.imageUrls) {
                            try {
                                const buffer = await recognizer.downloadImage(imageUrl);
                                const signature = await recognizer.getEnhancedImageSignature(buffer);

                                if (signature) {
                                    await ProfileImage.create({
                                        profileId: profile.id,
                                        url: imageUrl,
                                        signature
                                    });
                                }
                            } catch (error) {
                                console.error(`Image processing error: ${error.message}`);
                            }
                        }
                    } catch (error) {
                        console.error(`Profile processing error: ${error.message}`);
                    }
                }
            }
        } catch (err) {
            console.error('Scraping error:', err);
            isScraping = false;
        }
    },

    stopScraping: (req, res) => {
        isScraping = false;
        res.json({ message: 'Scraping stopped' });
    }
};