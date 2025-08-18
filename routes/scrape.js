const express = require('express');
const router = express.Router();
const { startScraping } = require('../controllers/scrapeController');

router.post('/start', startScraping);


module.exports = router;