const producer = require('./services/sqsProducer');
const { monitorLambdaLogs } = require('./monitor-lambda');

async function testLambdaTrigger() {
    try {
        // Test single message
        const order = {
            action: 'processOrder',
            customerId: "CUST001",
            items: [
                { productId: "P1", name: "iPhone", quantity: 1, price: 999.99 }
            ],
            totalAmount: 999.99,
            shippingAddress: {
                street: "123 Main St",
                city: "New York",
                state: "NY",
                zipCode: "10001",
                country: "USA"
            }
        };

        // Send to SQS
        const result = await producer.sendMessage(order);
        console.log("Order sent to SQS with MessageId:", result.MessageId);

        // Test batch messages
        const batchOrders = Array.from({ length: 3 }, (_, i) => ({
            action: 'processOrder',
            customerId: `CUST00${i + 2}`,
            items: [
                { 
                    productId: `P${i + 2}`, 
                    name: `Product ${i + 2}`, 
                    quantity: 1, 
                    price: 99.99 
                }
            ],
            totalAmount: 99.99,
            shippingAddress: {
                street: `${i + 2}00 Test St`,
                city: "Test City",
                state: "TS",
                zipCode: "12345",
                country: "USA"
            }
        }));

        // Send batch to SQS
        const batchResult = await producer.sendBatchMessages(batchOrders);
        console.log("Batch orders sent to SQS:", batchResult.Successful.length, "messages");

        return { singleMessageId: result.MessageId, batchResults: batchResult };
    } catch (error) {
        console.error("Error in Lambda trigger test:", error);
        throw error;
    }
}

async function waitAndCheckLogs(messageIds) {
    try {
        // Wait for Lambda to process messages
        console.log('\nWaiting for Lambda to process messages...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

        // Check CloudWatch logs
        console.log('\nChecking Lambda logs...');
        await monitorLambdaLogs();

        // Additional verification could be added here
        console.log('\nMessage IDs to verify:', messageIds);
    } catch (error) {
        console.error('Error checking logs:', error);
        throw error;
    }
}

// Run the complete test
async function runTest() {
    try {
        console.log('Starting Lambda trigger test...');
        const results = await testLambdaTrigger();
        await waitAndCheckLogs([results.singleMessageId, ...results.batchResults.Successful.map(r => r.MessageId)]);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runTest();

exports.handler = async (event) => {
    try {
        console.log('Received event:', JSON.stringify(event, null, 2));
        
        if (!event.Records || event.Records.length === 0) {
            throw new Error('No records found in event');
        }

        for (const record of event.Records) {
            console.log('Processing raw record:', JSON.stringify(record, null, 2));
            
            if (!record.body) {
                throw new Error('Empty message body received');
            }

            let body;
            try {
                body = JSON.parse(record.body);
            } catch (error) {
                console.error('Failed to parse message body:', record.body);
                throw new Error(`Invalid JSON in message body: ${error.message}`);
            }

            console.log('Parsed message body:', JSON.stringify(body, null, 2));

            // Validate message structure
            if (!isValidOrderMessage(body)) {
                throw new Error('Invalid order message structure');
            }

            // Format eventTime properly with better error handling
            let eventTime;
            try {
                // Convert Unix timestamp to milliseconds if needed
                let timestamp = record.attributes?.SentTimestamp || 
                              record.eventTime || 
                              Date.now();
                
                // If timestamp is a string, convert to number
                timestamp = Number(timestamp);
                
                // Check if timestamp is in seconds (Unix timestamp) and convert to milliseconds
                if (timestamp < 1e12) {
                    timestamp *= 1000;
                }
                
                eventTime = new Date(timestamp);
                
                // Validate the date
                if (isNaN(eventTime.getTime())) {
                    console.warn('Invalid timestamp, using current time');
                    eventTime = new Date();
                }

                console.log('Processed timestamp:', {
                    original: timestamp,
                    converted: eventTime.toISOString(),
                    unix: eventTime.getTime()
                });

            } catch (error) {
                console.warn('Error processing timestamp:', error);
                eventTime = new Date();
            }

            // Create order document
            const orderDoc = {
                messageId: record.messageId,
                eventSource: record.eventSource || 'aws:sqs',
                eventTime: eventTime,
                body: body,
                status: 'PROCESSING'
            };

            console.log('Created order document:', JSON.stringify(orderDoc, null, 2));

            // Process the order
            await processOrder(orderDoc);

            // Update status in MongoDB
            await updateOrderStatus(record.messageId, 'COMPLETED');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Order processed successfully' })
        };
    } catch (error) {
        console.error('Error processing order:', {
            error: error.message,
            stack: error.stack,
            type: error.constructor.name
        });
        
        if (event.Records && event.Records[0]) {
            await updateOrderStatus(event.Records[0].messageId, 'FAILED', error.message);
        }

        throw error;
    }
};

// Helper function to validate order message structure
function isValidOrderMessage(message) {
    if (!message || typeof message !== 'object') {
        console.error('Message is not an object');
        return false;
    }

    const requiredFields = ['action', 'customerId', 'items', 'totalAmount'];
    const missingFields = requiredFields.filter(field => !message[field]);

    if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return false;
    }

    if (!Array.isArray(message.items) || message.items.length === 0) {
        console.error('Items must be a non-empty array');
        return false;
    }

    const validItems = message.items.every(item => 
        item.productId && 
        item.name && 
        typeof item.quantity === 'number' && 
        typeof item.price === 'number'
    );

    if (!validItems) {
        console.error('Invalid items structure');
        return false;
    }

    return true;
} 