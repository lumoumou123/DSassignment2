import { SQSHandler, SQSEvent } from "aws-lambda";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, ReturnValue } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  UpdateCommand,
  DeleteCommand 
} from "@aws-sdk/lib-dynamodb";

const s3 = new S3Client();
const dynamoClient = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Use environment variable for table name
const IMAGE_TABLE_NAME = process.env.IMAGE_TABLE_NAME || "Images";

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log("Received invalid image event:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      // 解析SQS消息
      const recordBody = JSON.parse(record.body);
      console.log("Processing SQS message:", JSON.stringify(recordBody, null, 2));

      // 解析SNS消息
      const snsMessage = JSON.parse(recordBody.Message);
      console.log("SNS message body:", JSON.stringify(snsMessage, null, 2));

      // 检查消息属性
      const messageAttributes = recordBody.MessageAttributes || {};
      const messageType = messageAttributes.messageType?.Value;

      console.log("Message type:", messageType);
      if (messageType !== "INVALID_IMAGE") {
        console.log("Not an invalid image message, skipping");
        continue;
      }

      // 获取图像ID
      const imageId = snsMessage.id;
      if (!imageId) {
        console.error("No image ID provided in the message");
        continue;
      }

      console.log(`Processing invalid image with ID: ${imageId}`);

      // 从DynamoDB获取图像记录
      const getParams = {
        TableName: IMAGE_TABLE_NAME,
        Key: { id: imageId }
      };

      const getResult = await docClient.send(new GetCommand(getParams));
      const imageRecord = getResult.Item;

      if (!imageRecord) {
        console.error(`Image record not found for ID: ${imageId}`);
        continue;
      }

      console.log("Retrieved image record:", JSON.stringify(imageRecord, null, 2));

      // 从S3删除对象
      if (imageRecord.bucket && imageRecord.s3Key) {
        const deleteParams = {
          Bucket: imageRecord.bucket,
          Key: imageRecord.s3Key
        };

        console.log(`Deleting object from S3: ${JSON.stringify(deleteParams)}`);
        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log("Successfully deleted image from S3");
      } else {
        console.warn("Missing bucket or key information, S3 object not deleted");
      }

      // 更新DynamoDB记录状态或删除记录
      if (snsMessage.action === "DELETE_RECORD") {
        // 删除数据库记录
        const deleteParams = {
          TableName: IMAGE_TABLE_NAME,
          Key: { id: imageId }
        };
        
        console.log(`Deleting record from DynamoDB: ${imageId}`);
        await docClient.send(new DeleteCommand(deleteParams));
        console.log("Successfully deleted image record from DynamoDB");
      } else {
        // 更新记录状态为"invalid"
        const updateParams = {
          TableName: IMAGE_TABLE_NAME,
          Key: { id: imageId },
          UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":status": "invalid",
            ":updatedAt": new Date().toISOString()
          },
          ReturnValues: ReturnValue.ALL_NEW
        };
        
        console.log(`Updating record status to invalid: ${imageId}`);
        const updateResult = await docClient.send(new UpdateCommand(updateParams));
        console.log("Update result:", JSON.stringify(updateResult, null, 2));
      }

      console.log(`Successfully processed invalid image: ${imageId}`);
    } catch (error) {
      console.error("Error processing invalid image:", error);
    }
  }
}; 