import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const IMAGE_TABLE_NAME = process.env.IMAGE_TABLE_NAME;

// 验证元数据类型
const VALID_METADATA_TYPES = ["Caption", "Date", "name"];

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      // 解析SNS消息
      const snsMessage = JSON.parse(record.body);
      console.log("Received SNS message:", snsMessage);
      
      // 从SNS消息中获取实际的消息体
      const body = JSON.parse(snsMessage.Message);
      console.log("Parsed message body:", body);
      
      // 从SNS消息属性中获取metadata_type
      const messageAttributes = snsMessage.MessageAttributes;
      console.log("Message attributes:", messageAttributes);

      // 验证必要字段
      if (!body.id || !body.value) {
        console.error("Missing required fields in message body:", body);
        continue;
      }

      // 验证metadata_type属性
      const metadataType = messageAttributes?.metadata_type?.Value;
      if (!metadataType || !VALID_METADATA_TYPES.includes(metadataType)) {
        console.error(`Invalid or missing metadata type: ${metadataType}`);
        continue;
      }

      console.log("完整的SNS消息结构:", JSON.stringify({
        MessageBody: {
          id: body.id,
          value: body.value
        },
        MessageAttribute: {
          metadata_type: {
            DataType: "String",
            StringValue: metadataType
          }
        }
      }, null, 2));

      // 首先获取当前的metadata
      const getResult = await docClient.send(new GetCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id: body.id }
      }));

      if (!getResult.Item) {
        console.error(`Image with ID ${body.id} not found`);
        continue;
      }

      // 准备新的metadata
      const currentMetadata = getResult.Item.metadata || {};
      const newMetadata = {
        ...currentMetadata,
        [metadataType.toLowerCase()]: body.value
      };

      // 构建更新表达式
      const updateExpression = "set metadata = :metadata, lastUpdated = :lastUpdated";
      const expressionAttributeValues = {
        ":metadata": newMetadata,
        ":lastUpdated": new Date().toISOString()
      };

      console.log("Update parameters:", {
        TableName: IMAGE_TABLE_NAME,
        Key: { id: body.id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues
      });

      // 更新DynamoDB
      const result = await docClient.send(new UpdateCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id: body.id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW"
      }));

      console.log(`Metadata updated for image ${body.id}:`, result.Attributes);

    } catch (error) {
      console.error("Error processing metadata update:", error);
    }
  }
}; 