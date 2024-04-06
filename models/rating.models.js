const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    rankings: [
        {
            rank: { type: Number, required: true },
            userId: { type: Number, required: true },
            totalRefs: { type: Number, required: true, default: 0 }
        }
    ]
});

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
