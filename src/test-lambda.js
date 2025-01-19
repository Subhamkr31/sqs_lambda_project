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