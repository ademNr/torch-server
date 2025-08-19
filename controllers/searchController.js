const { authenticate } = require('../middleware/authMiddleware');
const recognizer = require('../config/recognizer');
const multer = require('multer');


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
        //  authenticate(), // Authenticates user
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