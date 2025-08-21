// models/ProfileImage.js
const mongoose = require('mongoose');

const profileImageSchema = new mongoose.Schema({
    url: { type: String },
    signature: { type: mongoose.Schema.Types.Mixed },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true } // Made required
}, { timestamps: false, autoIndex: true });

profileImageSchema.index({ "signature.enhancedHash.dctHash": 1 });
profileImageSchema.index({ profile: 1 });

module.exports = mongoose.model('ProfileImage', profileImageSchema);