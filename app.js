require('dotenv').config();
const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose'); // Added Mongoose
const scrapeRoutes = require('./routes/scrape');
const searchRoutes = require('./routes/search');
const authRoutes = require('./routes/auth');
const AuthService = require('./services/authService');
const recognizer = require('./config/recognizer');
const { authenticate } = require('./middleware/authMiddleware');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 5000;
const ProfileImage = require("./models/mongo/ProfileImage");
const Profile = require("./models/mongo/Profile");
(async () => {
    try {
        // MongoDB connection
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected');
        // Build indexes in background
        await ProfileImage.ensureIndexes();
        await Profile.ensureIndexes();

        console.log('Indexes initialized');

        // Initialize cache directories
        await recognizer.initializeCacheDirectories();

        app.use(cors());

        app.use(cookieParser());


        // Initialize authentication
        AuthService.initialize();
        app.use(passport.initialize({ session: false }));


        // Middleware
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Routes
        app.use('/auth', authRoutes);
        app.use('/scrape', scrapeRoutes);
        app.use('/search', authenticate(), searchRoutes);

        // Health check
        app.get('/', (req, res) => {
            res.send('✅ Backend is working!');
        });

        // Error handling
        app.use((err, req, res, next) => {
            console.error('Global error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Initialization error:', err);
        process.exit(1);
    }
})();