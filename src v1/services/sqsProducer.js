const { SQSClient, SendMessageCommand, SendMessageBatchCommand } = require("@aws-sdk/client-sqs");
require('dotenv').config();

// Verify required environment variables
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.SQS_QUEUE_URL) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

const client = new SQSClient({
  region: "us-east-1", // Hardcode the region to match your queue
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

class SQSProducer {
  async sendMessage(messageBody) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL, // Correct queue URL here
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: {
          "MessageType": {
            DataType: "String",
            StringValue: "TASK_MESSAGE",
          },
        },
      });

      const result = await client.send(command);
      console.log("Message sent successfully:", result.MessageId);
      return result;
    } catch (error) {
      console.error("Error sending message to SQS:", error);
      throw error;
    }
  }

  async sendBatchMessages(messages) {
    try {
      const entries = messages.map((message, index) => ({
        Id: `msg${index}`,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          "MessageType": {
            DataType: "String",
            StringValue: "TASK_MESSAGE",
          },
        },
      }));

      const command = new SendMessageBatchCommand({
        QueueUrl: process.env.SQS_QUEUE_URL, // Correct queue URL here
        Entries: entries,
      });

      const result = await client.send(command);
      console.log("Batch messages sent successfully");
      return result;
    } catch (error) {
      console.error("Error sending batch messages to SQS:", error);
      throw error;
    }
  }
}

module.exports = new SQSProducer();
