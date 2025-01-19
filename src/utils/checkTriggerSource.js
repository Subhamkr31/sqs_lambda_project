const LambdaTrigger = require('../models/LambdaTrigger');

async function checkTriggerSource() {
    const trigger = await LambdaTrigger.findOne().sort({ createdAt: -1 });
    
    if (trigger) {
        console.log('Trigger Details:');
        console.log('----------------');
        console.log(`Event Source: ${trigger.eventSource}`);  // "aws:sqs" means SQS triggered Lambda
        console.log(`Message ID: ${trigger.messageId}`);
        console.log(`Time: ${trigger.eventTime}`);
    }
} 