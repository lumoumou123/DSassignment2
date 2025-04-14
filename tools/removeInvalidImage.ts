import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { randomUUID } from "crypto";

console.log("Starting invalid image removal tool...");

// Get topic ARN from environment variable or command line
const topicArn = process.env.TOPIC_ARN || "";
console.log(`Topic ARN: ${topicArn}`);

if (!topicArn) {
  console.error("Error: TOPIC_ARN environment variable is not set");
  console.error("Please set it using: export TOPIC_ARN=<your-topic-arn>");
  console.error("You can find this value in the CDK deployment output");
  process.exit(1);
}

// Get command line arguments
const args = process.argv.slice(2);
console.log(`Command line arguments: ${JSON.stringify(args)}`);

if (args.length < 1) {
  console.error("Usage: npx ts-node tools/removeInvalidImage.ts <imageId> [deleteRecord]");
  console.error("  imageId: ID of the image to mark as invalid");
  console.error("  deleteRecord: optional 'true' to delete the record from DynamoDB as well");
  process.exit(1);
}

const imageId = args[0];
const deleteRecord = args[1] === "true";
console.log(`Image ID: ${imageId}, Delete Record: ${deleteRecord}`);

// Create SNS client
const snsClient = new SNSClient({});

// Prepare message
const message = {
  id: imageId,
  reason: "Invalid image format or content",
  action: deleteRecord ? "DELETE_RECORD" : "MARK_INVALID"
};
console.log(`Message body: ${JSON.stringify(message)}`);

// Prepare message attributes for filtering
const messageAttributes = {
  messageType: {
    DataType: "String",
    StringValue: "INVALID_IMAGE"
  }
};
console.log(`Message attributes: ${JSON.stringify(messageAttributes)}`);

const params = {
  TopicArn: topicArn,
  Message: JSON.stringify(message),
  MessageAttributes: messageAttributes
};
console.log(`SNS publish parameters: ${JSON.stringify(params)}`);

async function sendMessage() {
  try {
    console.log("Sending message to SNS...");
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    console.log(`Message sent successfully! Message ID: ${result.MessageId}`);
    console.log(`Marked image ${imageId} as invalid ${deleteRecord ? 'and scheduled for record deletion' : ''}`);
  } catch (error) {
    console.error("Error sending message:", error);
    console.error(error);
  }
}

console.log("Calling sendMessage function...");
sendMessage().then(() => {
  console.log("Send message operation completed.");
}); 