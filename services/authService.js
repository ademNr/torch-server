const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.User;

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
                const user = await User.findByPk(id);
                done(null, user);
            } catch (err) {
                done(err, null);
            }
        });
    }

    static async verifyCallback(accessToken, refreshToken, profile, done) {
        try {
            // Extract profile information
            const email = profile.emails[0].value;
            const name = profile.displayName;
            const googleId = profile.id;

            // Find or create user
            const [user] = await User.findOrCreate({
                where: { googleId },
                defaults: {
                    email,
                    name,
                    credits: 1
                }
            });

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

            return await User.findByPk(decoded.id);
        } catch (error) {
            return null;
        }
    }
}

module.exports = AuthService;