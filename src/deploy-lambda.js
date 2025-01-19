const {
    LambdaClient,
    UpdateFunctionCodeCommand,
    CreateEventSourceMappingCommand,
    UpdateFunctionConfigurationCommand,
    GetFunctionCommand,
    GetFunctionConfigurationCommand,
} = require("@aws-sdk/client-lambda");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
require("dotenv").config();

/**
 * Deploy Lambda Function
 */
async function deployLambda() {
    validateEnvVars(); // Ensure required environment variables are set

    const lambda = new LambdaClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    const tempDir = path.join(__dirname, "temp");
    const zipPath = path.join(__dirname, "lambda.zip");

    try {
        // Prepare files for Lambda deployment
        prepareLambdaFiles(tempDir);
        console.log("Installing dependencies...");
        installDependencies(tempDir);

        console.log("Creating ZIP file...");
        await createZip(tempDir, zipPath);

        console.log("Updating Lambda function code...");
        const zipFileBuffer = fs.readFileSync(zipPath);
        const updateCommand = new UpdateFunctionCodeCommand({
            FunctionName: process.env.LAMBDA_FUNCTION_NAME,
            ZipFile: zipFileBuffer,
        });

        await retryLambdaUpdate(lambda, updateCommand);
        console.log("Lambda function code updated successfully.");

        console.log("Updating Lambda configuration...");
        const currentConfig = await lambda.send(new GetFunctionConfigurationCommand({
            FunctionName: process.env.LAMBDA_FUNCTION_NAME,
        }));

        // Check if currentConfig and currentConfig.Environment are defined
        const currentEnvironment = currentConfig.Environment ? currentConfig.Environment.Variables : {};

        const newEnvironmentVariables = {
            MONGODB_URI: process.env.MONGODB_URI,
            SQS_QUEUE_URL: process.env.SQS_QUEUE_URL,
            // Do not include AWS_REGION as it is a reserved key
        };

        // Merge current environment variables with new ones, excluding reserved keys
        const updatedEnvironment = {
            ...currentEnvironment,
            ...newEnvironmentVariables,
        };

        const updateConfigCommand = new UpdateFunctionConfigurationCommand({
            FunctionName: process.env.LAMBDA_FUNCTION_NAME,
            Environment: {
                Variables: updatedEnvironment,
            },
        });

        await retryLambdaUpdate(lambda, updateConfigCommand);
        console.log("Lambda configuration updated successfully.");

        console.log("Creating SQS event source mapping...");
        await createSQSEventSourceMapping(lambda);

        console.log("Deployment completed successfully.");
    } catch (error) {
        console.error("Error during Lambda deployment:", error.message);
    } finally {
        cleanUp([tempDir, zipPath]);
    }
}

/**
 * Validate environment variables
 */
function validateEnvVars() {
    const requiredVars = [
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_REGION",
        "LAMBDA_FUNCTION_NAME",
        "MONGODB_URI",
        "SQS_QUEUE_URL",
        "SQS_EVENT_SOURCE_ARN",
    ];
    requiredVars.forEach((variable) => {
        if (!process.env[variable]) {
            throw new Error(`Environment variable ${variable} is missing.`);
        }
    });
}

/**
 * Prepare Lambda function files
 */
function prepareLambdaFiles(tempDir) {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir);

    const filesToCopy = [
        { src: "lambda/index.js", dest: "index.js" },
        { src: "lambda/orderProcessor.js", dest: "orderProcessor.js" },
        { src: "models/Order.js", dest: "models/Order.js" },
        { src: "models/LambdaTrigger.js", dest: "models/LambdaTrigger.js" },
        { src: "config/db-config.js", dest: "config/db-config.js" },
    ];

    const dirs = ["models", "config"];
    dirs.forEach((dir) => fs.mkdirSync(path.join(tempDir, dir), { recursive: true }));

    filesToCopy.forEach((file) => {
        fs.copyFileSync(path.join(__dirname, file.src), path.join(tempDir, file.dest));
    });

    fs.writeFileSync(
        path.join(tempDir, "package.json"),
        JSON.stringify(
            {
                name: "order-processor-lambda",
                version: "1.0.0",
                main: "index.js",
                dependencies: {
                    mongoose: "^8.9.5",
                    dotenv: "^16.0.0",
                },
            },
            null,
            2
        )
    );

    fs.writeFileSync(
        path.join(tempDir, ".env"),
        `
MONGODB_URI=${process.env.MONGODB_URI}
AWS_REGION=${process.env.AWS_REGION}
SQS_QUEUE_URL=${process.env.SQS_QUEUE_URL}`.trim()
    );
}

/**
 * Install dependencies in the temporary directory
 */
function installDependencies(tempDir) {
    require("child_process").execSync("npm install --production", {
        cwd: tempDir,
        stdio: "inherit",
    });
}

/**
 * Create ZIP file for Lambda function
 */
async function createZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", () => resolve());
        archive.on("error", reject);

        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

/**
 * Retry logic for Lambda operations
 */
async function retryLambdaUpdate(lambda, updateCommand, retries = 5, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            await lambda.send(updateCommand);
            return; // Exit if successful
        } catch (error) {
            if (error.name === 'ResourceConflictException' && i < retries - 1) {
                console.log(`Update conflict, retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
            } else {
                throw error; // Rethrow if it's not a conflict or no retries left
            }
        }
    }
}

// Function to check the status of the Lambda function
async function checkFunctionStatus(lambda, functionName) {
    try {
        const response = await lambda.send(new GetFunctionCommand({ FunctionName: functionName }));
        console.log(`Function status: ${response.Configuration.State}`);
        if (response.Configuration.State !== 'Active') {
            console.log(`Function is not active. Current state: ${response.Configuration.State}`);
            throw new Error(`Function is not active. Current state: ${response.Configuration.State}`);
        }
    } catch (error) {
        console.error(`Error checking function status: ${error.message}`);
        throw error; // Rethrow to handle in the retry logic
    }
}

/**
 * Create SQS event source mapping
 */
async function createSQSEventSourceMapping(lambda) {
    try {
        const command = new CreateEventSourceMappingCommand({
            FunctionName: process.env.LAMBDA_FUNCTION_NAME,
            EventSourceArn: process.env.SQS_EVENT_SOURCE_ARN,
            BatchSize: 10,
            Enabled: true,
        });
        await lambda.send(command);
        console.log("SQS event source mapping created successfully.");
    } catch (error) {
        if (error.name === "ResourceConflictException") {
            console.log("Event source mapping already exists.");
        } else {
            throw error;
        }
    }
}

/**
 * Clean up temporary files and directories
 */
function cleanUp(paths) {
    paths.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
            if (fs.lstatSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true });
            } else {
                fs.unlinkSync(filePath);
            }
        }
    });
}

deployLambda().catch(console.error);

