const scraperService = require('../services/scraperService');
const recognizer = require('../config/recognizer');
const Profile = require('../models/mongo/Profile');
const ProfileImage = require('../models/mongo/ProfileImage');

module.exports = {
    startScraping: async (req, res) => {

        const { token } = req.body
        if (!req.body.token) {
            return res.status(400).json({ error: 'token is required' });
        }

        res.json({ message: 'Scraping started', token: token });

        try {
            while (true) {
                const batch = await scraperService.scrapeBatch(token);
                for (const profileData of batch) {
                    try {
                        // Create profile with images
                        const newProfile = new Profile({
                            ...profileData,
                            scrapedAt: new Date(),
                            images: []
                        });
                        const savedProfile = await newProfile.save();
                        console.log(savedProfile.id);
                        // Process and save images
                        for (const imageUrl of profileData.imageUrls) {
                            try {
                                const buffer = await recognizer.downloadImage(imageUrl);
                                const signature = await recognizer.getEnhancedImageSignature(buffer);

                                if (signature) {
                                    const newImage = new ProfileImage({
                                        profile: savedProfile.id,
                                        url: imageUrl,
                                        signature

                                    });
                                    await newImage.save();

                                    // Add image reference to profile
                                    newProfile.images.push(newImage._id);
                                }
                            } catch (error) {
                                console.error(`Image processing error: ${error.message}`);
                            }
                        }

                        await newProfile.save();
                        console.log(`Saved profile: ${newProfile.name} with ${newProfile.images.length} images`);
                    } catch (error) {
                        console.error(`Profile processing error: ${error.message}`);
                    }
                }
            }
        } catch (err) {
            console.error('Scraping error:', err);
        }
    }
};