// Example of Lambda sending messages to SQS
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

exports.handler = async (event) => {
    const sqs = new SQSClient({ region: "us-east-1" });
    
    try {
        // Lambda processes something and sends to SQS
        const command = new SendMessageCommand({
            QueueUrl: process.env.SQS_QUEUE_URL,
            MessageBody: JSON.stringify({
                action: 'processOrder',
                orderId: 'ORD123',
                // ... other data
            })
        });
        
        await sqs.send(command);
        
    } catch (error) {
        console.error('Error sending to SQS:', error);
    }
}; 