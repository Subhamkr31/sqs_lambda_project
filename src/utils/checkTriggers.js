const mongoose = require('mongoose');
const LambdaTrigger = require('../models/LambdaTrigger');
require('dotenv').config();

async function checkTriggers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get recent triggers
        const triggers = await LambdaTrigger.find()
            .sort({ createdAt: -1 })
            .limit(10);

        console.log('\nRecent Lambda Triggers:');
        console.log('------------------------');
        
        triggers.forEach(trigger => {
            console.log(`
MessageID: ${trigger.messageId}
Status: ${trigger.status}
Time: ${trigger.eventTime}
${trigger.error ? `Error: ${trigger.error}` : ''}
------------------------`);
        });

        // Get trigger statistics
        const stats = await LambdaTrigger.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('\nTrigger Statistics:');
        console.log('-------------------');
        stats.forEach(stat => {
            console.log(`${stat._id}: ${stat.count}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    checkTriggers().catch(console.error);
}

module.exports = checkTriggers; 