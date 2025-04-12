import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.error("Usage: node updateMetadata.js <imageId> <metadata_type> <value>");
      console.error("Valid metadata types: Caption, Date, name");
      process.exit(1);
    }
    
    const [imageId, metadataType, value] = args;
    
    if (!["Caption", "Date", "name"].includes(metadataType)) {
      console.error("Invalid metadata type. Must be one of: Caption, Date, name");
      process.exit(1);
    }
    
    const topicArn = process.env.TOPIC_ARN;
    if (!topicArn) {
      console.error("Please set TOPIC_ARN environment variable");
      process.exit(1);
    }
    
    console.log("Sending metadata update with:");
    console.log("- Image ID:", imageId);
    console.log("- Metadata Type:", metadataType);
    console.log("- Value:", value);
    console.log("- Topic ARN:", topicArn);
    
    const message = {
      id: imageId,
      value: value
    };
    
    const client = new SNSClient({});
    
    const result = await client.send(new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      MessageAttributes: {
        "messageType": {
          DataType: "String",
          StringValue: "METADATA_UPDATE"
        },
        "metadata_type": {
          DataType: "String",
          StringValue: metadataType
        }
      }
    }));
    
    console.log("Metadata update sent successfully!");
    console.log("Message ID:", result.MessageId);
  } catch (err) {
    console.error("Error sending metadata update:", err);
    process.exit(1);
  }
}

main(); 