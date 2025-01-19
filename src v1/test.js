const producer = require('./services/sqsProducer');
const consumer = require('./services/sqsConsumer');

async function test() {
    try {
        // Send a test message
        await producer.sendMessage({
            test: "Hello World",
            timestamp: new Date().toISOString()
        });
        console.log("Test message sent!");
    } catch (error) {
        console.error("Error:", error);
    }
}

// Start the consumer with a message handler
async function startConsumer() {
    const messageHandler = async (message) => {
        console.log("Processing message:", message);
        // Add your custom message processing logic here
    };

    await consumer.startProcessing(messageHandler);
}

// Run both producer and consumer
test();
startConsumer(); 