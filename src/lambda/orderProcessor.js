const Order = require('./models/Order');
const LambdaTrigger = require('./models/LambdaTrigger');
const connectDB = require('./config/db-config');
require('dotenv').config();
const mongoose = require('mongoose');

let isConnected = false;

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Environment Variables:', {
        MONGODB_URI: process.env.MONGODB_URI,
        AWS_REGION: process.env.AWS_REGION,
        SQS_QUEUE_URL: process.env.SQS_QUEUE_URL,
    });

    // Validate environment variables
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not set.");
    }
    if (!process.env.SQS_QUEUE_URL) {
        throw new Error("SQS_QUEUE_URL is not set.");
    }

    // Connect to MongoDB
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // Removed deprecated options
            // useNewUrlParser: true, // Deprecated
            // useUnifiedTopology: true, // Optional, can be removed if not needed
        });
        console.log("Connected to MongoDB successfully.");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        throw new Error("Database connection failed.");
    }

    try {
        // Process each message from SQS
        for (const record of event.Records) {
            try {
                // Validate the eventTime
                const eventTime = record.attributes.SentTimestamp;
                const validEventTime = new Date(eventTime);
                if (isNaN(validEventTime.valueOf())) {
                    console.error(`Invalid eventTime: ${eventTime}`);
                    throw new Error(`Invalid eventTime: ${eventTime}`);
                }

                // Store the trigger event
                const trigger = new LambdaTrigger({
                    messageId: record.messageId,
                    eventSource: record.eventSource,
                    eventTime: validEventTime,
                    body: JSON.parse(record.body),
                    status: 'RECEIVED'
                });
                await trigger.save();
                console.log(`Trigger stored with ID: ${trigger._id}`);

                // Parse and process the order
                const orderData = JSON.parse(record.body);
                console.log('Processing order:', orderData);

                // Update trigger status
                trigger.status = 'PROCESSING';
                await trigger.save();

                // Create new order
                const order = new Order({
                    ...orderData,
                    orderId: `ORD${Date.now()}`,
                    status: 'NEW'
                });

                // Save order to database
                await order.save();
                console.log(`Order ${order.orderId} saved to database`);

                // Process based on action
                if (orderData.action === 'processOrder') {
                    // Update status to processing
                    order.status = 'PROCESSING';
                    await order.save();

                    // Simulate processing time
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Update status to completed
                    order.status = 'SHIPPED';
                    await order.save();

                    // Update trigger status
                    trigger.status = 'COMPLETED';
                    await trigger.save();

                    console.log(`Order ${order.orderId} processed successfully`);
                } else {
                    console.log('Invalid action:', orderData.action);
                    order.status = 'FAILED';
                    order.errorMessage = 'Invalid action';
                    await order.save();

                    // Update trigger status
                    trigger.status = 'FAILED';
                    trigger.error = 'Invalid action';
                    await trigger.save();
                }
            } catch (error) {
                console.error('Error processing record:', error);
                
                // Store failed trigger if possible
                try {
                    const failedTrigger = new LambdaTrigger({
                        messageId: record.messageId,
                        eventSource: record.eventSource,
                        eventTime: new Date(),
                        body: JSON.parse(record.body),
                        status: 'FAILED',
                        error: error.message
                    });
                    await failedTrigger.save();
                } catch (dbError) {
                    console.error('Error storing failed trigger:', dbError);
                }
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Processing complete' })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack
            })
        };
    }
}; 