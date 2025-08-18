const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres'
    }
);

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful!');
        await sequelize.close();
    } catch (error) {
        console.error('❌ Connection failed:', error);
    }
}

testConnection();