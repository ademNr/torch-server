require('dotenv').config();
const express = require('express');
const sequelize = require('./config/db');
const scrapeRoutes = require('./routes/scrape');
const searchRoutes = require('./routes/search');
const recognizer = require('./config/recognizer');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database and models
(async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        // Initialize models
        require('./models/Profile');
        require('./models/ProfileImage');
        await sequelize.sync({ alter: true });
        console.log('Database synchronized');

        // Initialize cache directories
        await recognizer.initializeCacheDirectories();

        // Start server
        app.use(express.json());
        app.use('/scrape', scrapeRoutes);   
        app.use('/search', searchRoutes);

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Initialization error:', err);
        process.exit(1);
    }
})();