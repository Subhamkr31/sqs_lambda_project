require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Create SQS instance
const sqs = new AWS.SQS();

// Define queue URL - you'll need to create this queue in AWS first
const QUEUE_URL = process.env.SQS_QUEUE_URL;

module.exports = {
  sqs,
  QUEUE_URL
}; 