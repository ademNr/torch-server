// models/ProfileImage.js
const mongoose = require('mongoose');

const profileImageSchema = new mongoose.Schema({
    url: { type: String },
    signature: { type: mongoose.Schema.Types.Mixed },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }
}, { timestamps: false, autoIndex: true });
profileImageSchema.index({ "signature.enhancedHash.dctHash": 1 }); // For prefix search
profileImageSchema.index({ profile: 1 }); // For profile lookup
module.exports = mongoose.model('ProfileImage', profileImageSchema);
