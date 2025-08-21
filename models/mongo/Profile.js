// models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    name: { type: String },
    age: { type: Number },
    distance: { type: Number },
    tinderId: { type: String, index: true, sparse: true, unique: true, },
    scrapedAt: { type: Date, default: Date.now },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProfileImage' }]
}, { timestamps: false, autoIndex: true });


profileSchema.methods.addImage = function (imageId) {
    if (!this.images.includes(imageId)) {
        this.images.push(imageId);
    }
    return this.save();
};
module.exports = mongoose.model('Profile', profileSchema);
