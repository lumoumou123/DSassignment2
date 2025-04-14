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

// 验证电子邮件格式的函数
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log("Status update event received:", JSON.stringify(event));
  
  for (const record of event.Records) {
    try {
      // Parse message
      const recordBody = JSON.parse(record.body);
      const messageBody = JSON.parse(recordBody.Message);
      console.log("Parsed message body:", messageBody);
      
      // 处理两种可能的消息格式
      let imageId: string;
      let status: string;
      let reason: string = "";
      
      // 格式1: 来自CLI的原始消息格式
      if (messageBody.id && messageBody.update && messageBody.update.status) {
        imageId = messageBody.id;
        status = messageBody.update.status;
        reason = messageBody.update.reason || "";
        console.log("Processing CLI format message");
      }
      // 格式2: 来自mailer的转发消息格式
      else if (messageBody.type === "STATUS_UPDATE" && messageBody.imageId && messageBody.newStatus) {
        imageId = messageBody.imageId;
        status = messageBody.newStatus;
        reason = messageBody.reason || "";
        console.log("Processing internal format message");
        
        // 如果已经是内部转发的消息，我们不需要再次处理它
        // 避免循环处理同一个消息
        console.log("Skipping further processing for internal message");
        continue;
      }
      else {
        console.error("Invalid status update message format:", messageBody);
        continue;
      }
      
      // Validate status value (only accept Pass or Reject)
      if (status !== "Pass" && status !== "Reject") {
        console.error(`Invalid status value: ${status}. Must be 'Pass' or 'Reject'`);
        continue;
      }
      
      // First get the current image record
      const getResult = await docClient.send(new GetCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id: imageId }
      }));
      
      if (!getResult.Item) {
        console.error(`Image with ID ${imageId} not found`);
        continue;
      }
      
      // Update the image status in DynamoDB
      await docClient.send(new UpdateCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id: imageId },
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
      
      console.log(`Image ${imageId} status updated to ${status}`);
      
      // Publish status update notification for email service
      if (STATUS_UPDATE_TOPIC_ARN) {
        // 检查摄影师邮箱是否有效，如果无效则设为null，让mailer函数使用默认邮箱
        const photographerEmail = getResult.Item.photographer && 
                                 isValidEmail(getResult.Item.photographer) ? 
                                 getResult.Item.photographer : null;
        
        if (!photographerEmail) {
          console.log(`Warning: Invalid or missing photographer email for image ${imageId}, will use default email.`);
        }
        
        await snsClient.send(new PublishCommand({
          TopicArn: STATUS_UPDATE_TOPIC_ARN,
          Message: JSON.stringify({
            type: "STATUS_UPDATE",
            imageId: imageId,
            newStatus: status,
            reason: reason || "",
            photographerEmail: photographerEmail,
            s3Key: getResult.Item.s3Key
          }),
          MessageAttributes: {
            "messageType": {
              DataType: "String",
              StringValue: "STATUS_UPDATE"
            }
          }
        }));
        
        console.log(`Status update notification sent for image ${imageId}`);
      }
      
    } catch (error) {
      console.error("Error processing status update:", error);
    }
  }
}; 