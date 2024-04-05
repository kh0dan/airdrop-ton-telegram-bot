const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true },
    user_username: String,
    user_first: String,
    user_lang: { type: String, default: 'en' },
    user_date: Number,
    user_balance: { type: Number, default: 300 },
    user_timer: { type: Number, default: 0 },
    user_state: { type: String, default: 'start' },
    user_wallet: { type: String, default: 'none' },
});

userSchema.index({ user_id: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;