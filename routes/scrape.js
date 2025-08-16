const express = require('express');
const router = express.Router();
const { startScraping, stopScraping } = require('../controllers/scrapeController');

router.post('/start', startScraping);
router.post('/stop', stopScraping);

module.exports = router;