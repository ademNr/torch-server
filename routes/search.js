const express = require('express');
const router = express.Router();
const { searchByImage } = require('../controllers/searchController');

router.post('/image-search', searchByImage);

module.exports = router;