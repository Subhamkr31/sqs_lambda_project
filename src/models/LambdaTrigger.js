const mongoose = require('mongoose');

const lambdaTriggerSchema = new mongoose.Schema({
    messageId: String,      // SQS message ID
    eventSource: String,    // Will show "aws:sqs"
    eventTime: Date,        // When SQS triggered Lambda
    body: mongoose.Schema.Types.Mixed,
    status: String
});

module.exports = mongoose.model('LambdaTrigger', lambdaTriggerSchema); 