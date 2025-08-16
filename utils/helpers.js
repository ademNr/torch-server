module.exports = {
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    getRandomDelay: (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
};