const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/mongo/User'); // Changed to Mongoose model

class AuthService {
    static initialize() {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
            scope: ['profile', 'email'],
            state: true
        }, this.verifyCallback));

        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        passport.deserializeUser(async (id, done) => {
            try {
                const user = await User.findById(id);
                done(null, user);
            } catch (err) {
                done(err, null);
            }
        });
    }

    static async verifyCallback(accessToken, refreshToken, profile, done) {
        try {
            const email = profile.emails[0].value;
            const name = profile.displayName;
            const googleId = profile.id;

            // Find or create user using Mongoose
            let user = await User.findOne({ googleId });

            if (!user) {
                user = new User({
                    googleId,
                    email,
                    name,
                    credits: 1
                });
                await user.save();
            }

            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }

    static generateToken(user) {
        return jwt.sign({
            id: user.id,
            email: user.email,
            name: user.name,
            credits: user.credits
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    static async getUserFromToken(token) {
        try {
            const decoded = this.verifyToken(token);
            if (!decoded) return null;

            return await User.findById(decoded.id);
        } catch (error) {
            return null;
        }
    }
}

module.exports = AuthService;