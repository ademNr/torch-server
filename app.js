require('dotenv').config();
const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose');
const scrapeRoutes = require('./routes/scrape');
const searchRoutes = require('./routes/search');
const authRoutes = require('./routes/auth');
const AuthService = require('./services/authService');
const recognizer = require('./config/recognizer');
const { authenticate } = require('./middleware/authMiddleware');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 5000;
const ProfileImage = require("./models/mongo/ProfileImage");
const Profile = require("./models/mongo/Profile");

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Additional stricter limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // limit auth attempts to 5 per window
    message: 'Too many authentication attempts, please try again later.'
});

(async () => {
    try {
        // MongoDB connection with security improvements
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,


        });
        console.log('✅ MongoDB connected');

        // Build indexes in background
        await ProfileImage.ensureIndexes();
        await Profile.ensureIndexes();
        console.log('Indexes initialized');

        // Initialize cache directories
        await recognizer.initializeCacheDirectories();

        // Security middleware
        app.use(helmet()); // Set security headers

        app.use(cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }));

        app.use(cookieParser());

        // Apply rate limiting to all requests
        app.use(limiter);

        // Apply stricter limiting to auth routes
        app.use('/auth', authLimiter);

        // Data sanitization against NoSQL query injection
        app.use(mongoSanitize());

        // Data sanitization against XSS
        app.use(xss());

        // Prevent parameter pollution
        app.use(hpp());

        // Initialize authentication
        AuthService.initialize();
        app.use(passport.initialize({ session: false }));

        // Middleware with security considerations
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
            // Don't leak error details in production
            const message = process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message;
            res.status(500).json({ error: message });
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', (err) => {
            console.log('UNHANDLED REJECTION! Shutting down...');
            console.log(err.name, err.message);
            process.exit(1);
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