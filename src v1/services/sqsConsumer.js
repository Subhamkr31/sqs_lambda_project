const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const Message = require('../models/Message');
const connectDB = require('../config/db-config');
require('dotenv').config();

// Connect to MongoDB when the consumer starts
connectDB();

const client = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

class SQSConsumer {
  async receiveMessages(maxMessages = 10) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MaxNumberOfMessages: maxMessages,
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ['All']
      });

      const result = await client.send(command);
      return result.Messages || [];
    } catch (error) {
      console.error('Error receiving messages from SQS:', error);
      throw error;
    }
  }

  async deleteMessage(receiptHandle) {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: receiptHandle
      });

      await client.send(command);
      console.log('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message from SQS:', error);
      throw error;
    }
  }

  async storeMessageInDB(message, parsedBody) {
    try {
      const messageRecord = new Message({
        messageId: message.MessageId,
        body: parsedBody,
        messageType: message.MessageAttributes?.MessageType?.StringValue || 'TASK_MESSAGE',
        processedAt: new Date(),
        status: 'PROCESSED'
      });

      await messageRecord.save();
      console.log('Message stored in database:', message.MessageId);
    } catch (error) {
      console.error('Error storing message in database:', error);
      throw error;
    }
  }

  async startProcessing(messageHandler) {
    console.log('Starting SQS message processing...');
    
    while (true) {
      try {
        const messages = await this.receiveMessages();
        
        if (messages.length === 0) {
          console.log('No new messages, waiting...');
          continue;
        }

        for (const message of messages) {
          try {
            // Parse message body
            const parsedBody = JSON.parse(message.Body);
            
            // Process the message with custom handler
            await messageHandler(parsedBody);
            
            // Store in database
            await this.storeMessageInDB(message, parsedBody);
            
            // Delete from SQS after successful processing and storage
            await this.deleteMessage(message.ReceiptHandle);
          } catch (error) {
            console.error('Error processing message:', error);
            // Store failed message in database
            try {
              const messageRecord = new Message({
                messageId: message.MessageId,
                body: JSON.parse(message.Body),
                messageType: message.MessageAttributes?.MessageType?.StringValue,
                processedAt: new Date(),
                status: 'FAILED',
                error: error.message
              });
              await messageRecord.save();
            } catch (dbError) {
              console.error('Error storing failed message:', dbError);
            }
          }
        }
      } catch (error) {
        console.error('Error in message processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}

module.exports = new SQSConsumer();
