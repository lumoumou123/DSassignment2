import { SQSHandler, SQSEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

// Initialize clients
const dynamoClient = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient();

// Environment variables
const IMAGE_TABLE_NAME = process.env.IMAGE_TABLE_NAME || "Images";
const STATUS_UPDATE_TOPIC_ARN = process.env.STATUS_UPDATE_TOPIC_ARN || "";

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log("Status update event received:", JSON.stringify(event));
  
  for (const record of event.Records) {
    try {
      // Parse message
      const recordBody = JSON.parse(record.body);
      const messageBody = JSON.parse(recordBody.Message);
      
      // Validate status update message format
      if (!messageBody.id || !messageBody.update || !messageBody.update.status) {
        console.error("Invalid status update message format:", messageBody);
        continue;
      }
      
      const { id, date, update } = messageBody;
      const { status, reason } = update;
      
      // Validate status value (only accept Pass or Reject)
      if (status !== "Pass" && status !== "Reject") {
        console.error(`Invalid status value: ${status}. Must be 'Pass' or 'Reject'`);
        continue;
      }
      
      // First get the current image record
      const getResult = await docClient.send(new GetCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id }
      }));
      
      if (!getResult.Item) {
        console.error(`Image with ID ${id} not found`);
        continue;
      }
      
      // Update the image status in DynamoDB
      await docClient.send(new UpdateCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id },
        UpdateExpression: "set #status = :status, reason = :reason, lastUpdated = :lastUpdated",
        ExpressionAttributeNames: {
          "#status": "status" // status is a reserved word in DynamoDB
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":reason": reason || "",
          ":lastUpdated": new Date().toISOString()
        },
        ReturnValues: "ALL_NEW"
      }));
      
      console.log(`Image ${id} status updated to ${status}`);
      
      // Publish status update notification for email service
      if (STATUS_UPDATE_TOPIC_ARN) {
        await snsClient.send(new PublishCommand({
          TopicArn: STATUS_UPDATE_TOPIC_ARN,
          Message: JSON.stringify({
            type: "STATUS_UPDATE",
            imageId: id,
            newStatus: status,
            reason: reason || "",
            photographerEmail: getResult.Item.photographer,
            s3Key: getResult.Item.s3Key
          }),
          MessageAttributes: {
            "messageType": {
              DataType: "String",
              StringValue: "STATUS_UPDATE"
            }
          }
        }));
        
        console.log(`Status update notification sent for image ${id}`);
      }
      
    } catch (error) {
      console.error("Error processing status update:", error);
    }
  }
}; 