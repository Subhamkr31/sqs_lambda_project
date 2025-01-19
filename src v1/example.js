const sqsProducer = require('./services/sqsProducer');
const sqsConsumer = require('./services/sqsConsumer');

// Example message handler
const messageHandler = async (message) => {
  console.log('Processing message:', message);
  // Add your message processing logic here
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
  console.log('Message processed successfully');
};

// Example usage
async function example() {
  try {
    // Send a single message
    await sqsProducer.sendMessage({
      id: 1,
      task: 'example task',
      timestamp: new Date().toISOString()
    });

    // Send batch messages
    await sqsProducer.sendBatchMessages([
      { id: 2, task: 'batch task 1' },
      { id: 3, task: 'batch task 2' }
    ]);

    // Start consuming messages
    sqsConsumer.startProcessing(messageHandler);
  } catch (error) {
    console.error('Error in example:', error);
  }
}

example(); 