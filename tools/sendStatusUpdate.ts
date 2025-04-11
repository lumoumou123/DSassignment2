import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Usage: ts-node tools/sendStatusUpdate.ts <imageId> <status> <reason>
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: ts-node sendStatusUpdate.ts <imageId> <status> <reason>");
    process.exit(1);
  }
  
  const [imageId, status, reason = ""] = args;
  
  if (status !== "Pass" && status !== "Reject") {
    console.error("Status must be either 'Pass' or 'Reject'");
    process.exit(1);
  }
  
  const topicArn = process.env.TOPIC_ARN;
  if (!topicArn) {
    console.error("Please set TOPIC_ARN environment variable");
    process.exit(1);
  }
  
  const message = {
    id: imageId,
    date: new Date().toLocaleDateString("en-GB"), // 01/05/2025 format
    update: {
      status: status,
      reason: reason
    }
  };
  
  const client = new SNSClient();
  
  try {
    await client.send(new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      MessageAttributes: {
        "messageType": {
          DataType: "String", 
          StringValue: "STATUS_UPDATE"
        }
      }
    }));
    
    console.log(`Status update sent: ${status} for image ${imageId}`);
  } catch (err) {
    console.error("Error sending status update:", err);
  }
}

main().catch(console.error); 