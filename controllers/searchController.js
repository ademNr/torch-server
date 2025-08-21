const { authenticate } = require('../middleware/authMiddleware');
const recognizer = require('../config/recognizer');
const multer = require('multer');

const Profile = require('../models/mongo/Profile');
const ProfileImage = require('../models/mongo/ProfileImage');
const User = require('../models/mongo/User'); // MongoDB User model
// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    }
});

const uploadMiddleware = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                error: err.message || 'File upload error'
            });
        }
        next();
    });
};

module.exports = {
    searchByImage: [
        authenticate(),
        uploadMiddleware,
        async (req, res) => {
            const userId = req.user.id; // Get user ID from authenticated request
            console.log(req.user.credits);
            try {
                // 1. Atomically deduct credit
                // Deduct credit - MongoDB version
                const user = await User.findById(userId);
                if (user.credits < 1) {
                    return res.status(403).json({
                        error: 'Insufficient credits',
                        credits: user.credits
                    });
                }

                user.credits -= 1;
                await user.save();


                // 2. Process the image
                if (!req.file) {
                    throw new Error('No image uploaded');
                }

                const buffer = await recognizer.preprocessImage(req.file.buffer);
                const signature = await recognizer.getEnhancedImageSignature(buffer);

                if (!signature) {
                    throw new Error('Failed to generate image signature');
                }

                // 3. Perform search
                const searchResults = await recognizer.findBestMatches(signature, 10);



                // 5. Return successful response

                res.json({
                    ...searchResults,
                    credits: user.credits - 1,
                    message: `Search completed. ${searchResults.matches.length} matches found.`
                });

            } catch (err) {
                // 6. Refund credit on error
                await User.findByIdAndUpdate(userId, { $inc: { credits: 1 } });

                // Error handling (same as before)
                let errorMessage = err.message;
                if (err.message.includes('preprocessImage')) {
                    errorMessage = 'Invalid image format. Please upload a valid JPG/PNG image.';
                }

                // Get current credit balance
                const currentUser = await User.findById(userId);

                res.status(500).json({
                    error: errorMessage,
                    credits: currentUser.credits,
                    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
                });
            }
        }
    ],
    // Add endpoint to check credits without performing search
    searchByFilters: [
        authenticate(),
        async (req, res) => {
            try {
                const { name, minAge, maxAge } = req.body;
                const userId = req.user.id;
                const user = await User.findById(userId);

                if (user.credits < 1) {
                    return res.status(403).json({
                        error: 'Insufficient credits',
                        credits: user.credits
                    });
                }

                user.credits -= 1;
                await user.save();

                const limit = 20; // Default limit as requested

                // Build filter object
                const filter = {};

                // Name filter (case-insensitive partial match)
                if (name) {
                    filter.name = { $regex: name, $options: 'i' };
                }

                // Age filter
                if (minAge !== undefined || maxAge !== undefined) {
                    filter.age = {};
                    if (minAge !== undefined) filter.age.$gte = parseInt(minAge);
                    if (maxAge !== undefined) filter.age.$lte = parseInt(maxAge);
                }

                // Execute query - first find profiles
                const profiles = await Profile.find(filter)
                    .limit(limit)
                    .sort({ scrapedAt: -1 });

                // Get all profile IDs
                const profileIds = profiles.map(profile => profile._id);

                // Find all images associated with these profiles in a single query
                const images = await ProfileImage.find({
                    profile: { $in: profileIds }
                });

                // Group images by profile ID for easier lookup
                const imagesByProfile = {};
                images.forEach(image => {
                    const profileId = image.profile.toString();
                    if (!imagesByProfile[profileId]) {
                        imagesByProfile[profileId] = [];
                    }
                    imagesByProfile[profileId].push(image);
                });

                // Format the response and filter out profiles with no images
                const matches = profiles
                    .map(profile => {
                        const profileId = profile._id.toString();
                        const profileImages = imagesByProfile[profileId] || [];

                        // Skip profiles with no images
                        if (profileImages.length === 0) {
                            return null;
                        }

                        // Get all image URLs
                        const imageUrls = profileImages.map(img => img.url);

                        // Use the first image as the matched image
                        const matchedImage = profileImages[0];

                        return {
                            profileId: profile._id,
                            name: profile.name,
                            age: profile.age,
                            distance: profile.distance,
                            scrapedAt: profile.scrapedAt,
                            tinderId: profile.tinderId,
                            matchedImageId: matchedImage._id,
                            matchedImageUrl: matchedImage.url,
                            imageUrls: imageUrls,
                            similarity: 1, // Default value since we're not doing image matching
                            confidenceLevel: "very-high" // Default value
                        };
                    })
                    .filter(match => match !== null); // Remove null entries (profiles with no images)

                res.json({
                    matches: matches
                });

            } catch (err) {
                console.error('Search error:', err);
                res.status(500).json({
                    error: 'Search failed',
                    details: process.env.NODE_ENV === 'development' ? err.message : undefined
                });
            }
        }
    ],

    checkCredits: [
        authenticate(),
        (req, res) => {
            res.json({
                credits: req.user.credits,
                message: req.user.credits > 0
                    ? 'You have credits available'
                    : 'No credits remaining'
            });
        }
    ]
};