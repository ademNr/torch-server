require('dotenv').config();
const express = require('express');
const passport = require('passport');
const db = require('./models');
const scrapeRoutes = require('./routes/scrape');
const searchRoutes = require('./routes/search');
const authRoutes = require('./routes/auth');
// const AuthService = require('./services/authService');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const recognizer = require('./config/recognizer');
const { authenticate } = require('./middleware/authMiddleware');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;




// Initialize services
(async () => {
    try {

        // Database connection
        await db.sequelize.authenticate();
        console.log('Database connected');
        // Session middleware

        // Sync models
        await db.sequelize.sync({ alter: true });
        console.log('Database synchronized');
        app.use(cors());
        app.use(cookieParser());
        app.use(session({
            secret: process.env.SESSION_SECRET || 'your_secret_key_here',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }));
        // Initialize authentication
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
            scope: ['profile', 'email']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails[0].value;
                const name = profile.displayName;
                const googleId = profile.id;

                const [user] = await db.User.findOrCreate({
                    where: { googleId },
                    defaults: { email, name, credits: 1 }
                });

                return done(null, user);
            } catch (error) {
                return done(error, null);
            }
        }));

        app.use(passport.initialize());

        // Initialize cache directories
        await recognizer.initializeCacheDirectories();

        // Middleware
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Routes
        app.use('/auth', authRoutes);
        app.use('/scrape', scrapeRoutes);
        app.use('/search', authenticate(), searchRoutes); // Protected route

        // Health check endpoint
        app.get('/', (req, res) => {
            res.send('✅ Backend is working!');
        });

        // Protected user endpoint
        app.get('/protected', authenticate(), (req, res) => {
            res.json({ message: 'Protected resource', user: req.user });
        });

        // Error handling middleware
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

