const AuthService = require('../services/authService');

const authenticate = () => {
    return async (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const user = await AuthService.getUserFromToken(token);

            if (!user) {
                return res.status(401).json({ error: 'Invalid token' });
            }

            // Attach minimal user information to request
            req.user = {
                id: user.id,
                credits: user.credits
            };

            next();
        } catch (error) {
            res.status(500).json({ error: 'Authentication error' });
        }
    };
};

module.exports = {
    authenticate
};