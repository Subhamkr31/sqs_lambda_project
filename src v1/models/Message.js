const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    body: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    messageType: {
        type: String,
        default: 'TASK_MESSAGE'
    },
    processedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['PROCESSED', 'FAILED'],
        default: 'PROCESSED'
    }
});

module.exports = mongoose.model('Message', messageSchema); 