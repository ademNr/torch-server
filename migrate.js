import dotenv from 'dotenv';
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = ['DB_DATABASE', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`❌ Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

import mongoose from 'mongoose';
import db from './models/index.js'; // Uses existing Sequelize instance

// Mongoose models
import Profile from './models/mongo/Profile.js';
import ProfileImage from './models/mongo/ProfileImage.js';


(async () => {
    try {
        // 1. Connect to PostgreSQL using existing instance
        await db.sequelize.authenticate();
        console.log('✅ Connected to PostgreSQL');

        // 2. Connect to MongoDB
        await mongoose.connect("db");
        console.log('✅ Connected to MongoDB');


        // 4. Migrate Profiles + Images (update existing)
        const profiles = await db.Profile.findAll({
            include: {
                model: db.ProfileImage,
                as: 'images'
            }
        });

        let profileCreatedCount = 0;
        let profileUpdatedCount = 0;
        let imageCreatedCount = 0;
        let imageUpdatedCount = 0;

        for (const p of profiles) {
            // Find existing profile by tinderId
            const existingProfile = await Profile.findOne({ tinderId: p.tinderId });
            let profileId;

            if (existingProfile) {
                // Update existing profile
                existingProfile.name = p.name;
                existingProfile.age = p.age;
                existingProfile.distance = p.distance;
                existingProfile.scrapedAt = p.scrapedAt;
                await existingProfile.save();
                profileId = existingProfile._id;
                profileUpdatedCount++;
            } else {
                // Create new profile
                const newProfile = await Profile.create({
                    name: p.name,
                    age: p.age,
                    distance: p.distance,
                    tinderId: p.tinderId,
                    scrapedAt: p.scrapedAt
                });
                profileId = newProfile._id;
                profileCreatedCount++;
            }

            // Process images
            for (const img of p.images) {
                // Find existing image by signature
                const existingImage = await ProfileImage.findOne({
                    profile: profileId,
                    signature: img.signature
                });

                if (existingImage) {
                    // Update existing image
                    existingImage.url = img.url;
                    await existingImage.save();
                    imageUpdatedCount++;
                } else {
                    // Create new image
                    await ProfileImage.create({
                        url: img.url,
                        signature: img.signature,
                        profile: profileId
                    });
                    imageCreatedCount++;
                }
            }
        }

        console.log(`✅ Profiles: ${profileCreatedCount} created, ${profileUpdatedCount} updated`);
        console.log(`✅ Images: ${imageCreatedCount} created, ${imageUpdatedCount} updated`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
})();