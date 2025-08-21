const express = require('express');
const router = express.Router();
const { searchByImage, searchByFilters } = require('../controllers/searchController');

// Add a dedicated error handler for this route
router.post('/image-search', ...searchByImage, (err, req, res, next) => {
    if (err) {
        console.error('Route error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/profile-search', ...searchByFilters);
module.exports = router;