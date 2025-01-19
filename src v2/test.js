const producer = require('./services/sqsProducer');
const consumer = require('./services/sqsConsumer');

async function simulateOrders() {
    try {
        // Single order test
        const singleOrder = {
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

        // Send single order
        await producer.sendMessage(singleOrder);
        console.log("Single order sent successfully");

        // Batch orders test
        const batchOrders = [
            {
                customerId: "CUST002",
                items: [
                    { productId: "P2", name: "MacBook Pro", quantity: 1, price: 1299.99 },
                    { productId: "P3", name: "AirPods", quantity: 1, price: 199.99 }
                ],
                totalAmount: 1499.98,
                shippingAddress: {
                    street: "456 Oak Ave",
                    city: "San Francisco",
                    state: "CA",
                    zipCode: "94102",
                    country: "USA"
                }
            },
            {
                customerId: "CUST003",
                items: [
                    { productId: "P4", name: "iPad", quantity: 1, price: 799.99 }
                ],
                totalAmount: 799.99,
                shippingAddress: {
                    street: "789 Pine St",
                    city: "Chicago",
                    state: "IL",
                    zipCode: "60601",
                    country: "USA"
                }
            },
            {
                customerId: "CUST004",
                items: [
                    { productId: "P5", name: "Apple Watch", quantity: 1, price: 399.99 },
                    { productId: "P6", name: "Apple TV", quantity: 1, price: 179.99 }
                ],
                totalAmount: 579.98,
                shippingAddress: {
                    street: "321 Maple Dr",
                    city: "Boston",
                    state: "MA",
                    zipCode: "02108",
                    country: "USA"
                }
            }
        ];

        // Send batch orders
        await producer.sendBatchMessages(batchOrders);
        console.log("Batch orders sent successfully");

    } catch (error) {
        console.error("Error sending orders:", error);
    }
}

// Start the consumer
async function startOrderProcessing() {
    try {
        await consumer.startProcessing(async (message) => {
            console.log("Processing order:", message);
            await consumer.processOrder(message);
        });
    } catch (error) {
        console.error("Error in order processing:", error);
    }
}

// Test specific functions
async function testBatchProcessing() {
    try {
        // Generate 10 test orders
        const testOrders = Array.from({ length: 10 }, (_, index) => ({
            customerId: `CUST${1000 + index}`,
            items: [
                {
                    productId: `P${index + 1}`,
                    name: `Product ${index + 1}`,
                    quantity: Math.floor(Math.random() * 3) + 1,
                    price: parseFloat((Math.random() * 1000 + 100).toFixed(2))
                }
            ],
            totalAmount: 0, // Will be calculated
            shippingAddress: {
                street: `${1000 + index} Test St`,
                city: "Test City",
                state: "TS",
                zipCode: "12345",
                country: "USA"
            }
        }));

        // Calculate total amounts
        testOrders.forEach(order => {
            order.totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        });

        // Send in batches of 3 (SQS batch limit is 10)
        for (let i = 0; i < testOrders.length; i += 3) {
            const batch = testOrders.slice(i, i + 3);
            await producer.sendBatchMessages(batch);
            console.log(`Batch ${Math.floor(i/3) + 1} sent successfully`);
        }

    } catch (error) {
        console.error("Error in batch processing test:", error);
    }
}

// Run the tests
async function runTests() {
    console.log("Starting batch processing test...");
    await testBatchProcessing();
    
    console.log("\nStarting order simulation...");
    await simulateOrders();
    
    console.log("\nStarting order processing...");
    await startOrderProcessing();
}

runTests(); 