const { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
require('dotenv').config();
process.env.AWS_NODE_DEBUG = '1';

// Create CloudWatch Logs client with credentials
const cloudWatchLogs = new CloudWatchLogsClient({
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

async function monitorLambdaLogs() {
    const params = {
        logGroupName: '/aws/lambda/OrderProcessor',
        startTime: Date.now() - (5 * 60 * 1000), // Last 5 minutes
        limit: 10,
        descending: true // Get most recent first
    };

    try {
        // Get log streams
        const describeCommand = new DescribeLogStreamsCommand(params);
        const logStreams = await cloudWatchLogs.send(describeCommand);

        // Process each stream
        for (const stream of logStreams.logStreams || []) {
            const getLogsCommand = new GetLogEventsCommand({
                logGroupName: params.logGroupName,
                logStreamName: stream.logStreamName,
                startTime: params.startTime,
                limit: params.limit
            });

            const logs = await cloudWatchLogs.send(getLogsCommand);
            
            console.log(`\nLog Stream: ${stream.logStreamName}`);
            console.log('----------------------------------------');
            
            if (logs.events && logs.events.length > 0) {
                logs.events.forEach(event => {
                    console.log(`${new Date(event.timestamp).toISOString()}: ${event.message}`);
                });
            } else {
                console.log('No logs found in this stream');
            }
        }
    } catch (error) {
        console.error('Error monitoring logs:', error);
        if (error.Code === 'ResourceNotFoundException') {
            console.log('Log group not found. Make sure the Lambda function has been invoked at least once.');
        }
    }
}

// Export the function
module.exports = { monitorLambdaLogs };

// Only run directly if this is the main module
if (require.main === module) {
    (async () => {
        try {
            console.log('Starting Lambda logs monitoring...');
            await monitorLambdaLogs();
        } catch (error) {
            console.error('Fatal error:', error);
            process.exit(1);
        }
    })();
} 