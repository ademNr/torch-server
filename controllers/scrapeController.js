const scraperService = require('../services/scraperService');
const recognizer = require('../config/recognizer');
const { Profile, ProfileImage } = require('../models');
//const cleanupService = require('../services/cleanupService');


module.exports = {
    startScraping: async (req, res) => {

        const { token } = req.body
        if (!req.body.token) {
            return res.status(400).json({ error: 'token is required' });
        }

        res.json({ message: 'Scraping started with', token: token });

        try {
            while (true) {
                const batch = await scraperService.scrapeBatch(token);
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
                                console.log(token);
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

        }
    },



};