const mongoose = require('mongoose');

const referalSchema = new mongoose.Schema({
    user_initiator: { type: Number, required: true },
    user_invited: { type: Number, required: true },
    date: { type: Number },
    active: { type: Number, default: 0 },
});

referalSchema.index({ user_initiator: 1, user_invited: 1 }, { unique: true });

const Referal = mongoose.model('Referal', referalSchema);

module.exports = Referal;