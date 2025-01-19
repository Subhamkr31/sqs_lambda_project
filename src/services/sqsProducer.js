const { SQSClient, SendMessageCommand, SendMessageBatchCommand } = require("@aws-sdk/client-sqs");
require('dotenv').config();

// Verify required environment variables
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.SQS_QUEUE_URL) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

class SQSProducer {
  constructor() {
    this.client = new SQSClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
  }

  async sendMessage(orderData) {
    try {
      const command = new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(orderData),
        MessageAttributes: {
          "OrderType": {
            DataType: "String",
            StringValue: "NEW_ORDER"
          },
          "Priority": {
            DataType: "Number",
            StringValue: "1"
          }
        }
      });

      const result = await this.client.send(command);
      console.log("Message sent successfully:", result.MessageId);
      return result;
    } catch (error) {
      console.error("Error sending message to SQS:", error);
      throw error;
    }
  }

  async sendBatchMessages(orders) {
    try {
      const entries = orders.map((order, index) => ({
        Id: `msg${index}`,
        MessageBody: JSON.stringify(order),
        MessageAttributes: {
          "OrderType": {
            DataType: "String",
            StringValue: "NEW_ORDER"
          },
          "Priority": {
            DataType: "Number",
            StringValue: "1"
          }
        }
      }));

      const command = new SendMessageBatchCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        Entries: entries
      });

      const result = await this.client.send(command);
      console.log("Batch messages sent successfully");
      return result;
    } catch (error) {
      console.error("Error sending batch messages to SQS:", error);
      throw error;
    }
  }
}

module.exports = new SQSProducer();
