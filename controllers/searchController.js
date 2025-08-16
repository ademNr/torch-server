const recognizer = require('../config/recognizer');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

module.exports = {
    searchByImage: [
        upload.single('image'),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No image uploaded' });
                }

                // Generate signature for uploaded image
                const buffer = await recognizer.preprocessImage(req.file.buffer);
                const signature = await recognizer.getEnhancedImageSignature(buffer);

                if (!signature) {
                    return res.status(400).json({ error: 'Failed to generate image signature' });
                }

                // Find matches
                const { matches } = await recognizer.findBestMatches(signature, 10);

                res.json(matches);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        }
    ]
};