# sqs_lambda_project

## Description
This project demonstrates the integration between Amazon Simple Queue Service (SQS) and AWS Lambda. It creates a serverless architecture where messages sent to an SQS queue trigger Lambda functions for processing.

## Architecture
- Amazon SQS Queue acts as an event source
- AWS Lambda function processes messages from the queue
- Dead Letter Queue (DLQ) handles failed message processing

## Features
- Asynchronous message processing
- Automatic scaling based on queue length
- Error handling with DLQ
- Configurable message retention and visibility timeout

## Prerequisites
- AWS Account
- AWS CLI configured
- Necessary IAM permissions for SQS and Lambda

## Setup
1. Create an SQS queue
2. Deploy the Lambda function
3. Configure the SQS trigger for Lambda
4. Set up monitoring and alerts

## Usage
Details on how to:
- Send messages to the queue
- Monitor message processing
- Handle errors and retries

## Troubleshooting
Common failure reasons and solutions:

### Status: FAILED
1. Check CloudWatch Logs for detailed error messages
2. Verify MongoDB connection string and credentials
3. Ensure all required fields are present in the message
4. Validate AWS IAM permissions
5. Check Lambda function timeout settings
6. Verify network connectivity to MongoDB

### Monitoring
- Use CloudWatch Metrics to monitor:
  - Lambda execution times
  - Error rates
  - SQS queue depth
  - DLQ messages

### Error Recovery
1. Messages that fail processing will be:
   - Retried up to 3 times
   - Moved to DLQ after max retries
   - Logged in CloudWatch
   - Marked as FAILED in MongoDB

### Timestamp Handling
The system handles timestamps in the following order:
1. Uses SQS message attribute `SentTimestamp`
2. Falls back to event's `eventTime`
3. Uses current time as last resort

All timestamps are stored in ISO format in MongoDB.

Note: If you're seeing timestamp-related errors, ensure your messages include a valid timestamp or let the system use the default current time.

## Contributing
Instructions for contributing to the project

## License
[Add your license information here]

