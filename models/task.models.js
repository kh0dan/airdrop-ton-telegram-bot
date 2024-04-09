const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    user_id: { type: Number, required: true },
    task_id: { type: Number, required: true },
    date: { type: Number },
    comment: String,
});

taskSchema.index({ user_id: 1, task_id: 1 }, { unique: true });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;