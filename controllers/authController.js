const passport = require('passport');
const AuthService = require('../services/authService');

module.exports = {
    googleAuth: passport.authenticate('google', {
        scope: ['profile', 'email']
    }),

    googleCallback: passport.authenticate('google', {
        session: false,
        failureRedirect: '/login'
    }),

    handleCallback: (req, res) => {
        try {
            const token = AuthService.generateToken(req.user);
            res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
        } catch (error) {
            res.status(500).json({ error: 'Authentication failed' });
        }
    },

    getUser: async (req, res) => {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            const user = await AuthService.getUserFromToken(token);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                credits: user.credits
            });
        } catch (err) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
};