import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const IMAGE_TABLE_NAME = process.env.IMAGE_TABLE_NAME;

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    try {
      // 解析SNS消息
      const snsMessage = JSON.parse(record.body);
      console.log("Received SNS message:", snsMessage);
      
      // 从SNS消息中获取实际的消息体
      const body = JSON.parse(snsMessage.Message);
      console.log("Parsed message body:", body);

      // 验证必要字段
      if (!body.id || !body.value) {
        console.error("Missing required fields in message body:", body);
        continue;
      }

      // 更新DynamoDB中的photographer字段
      const result = await docClient.send(new UpdateCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id: body.id },
        UpdateExpression: "set photographer = :photographer, lastUpdated = :lastUpdated",
        ExpressionAttributeValues: {
          ":photographer": body.value,
          ":lastUpdated": new Date().toISOString()
        },
        ReturnValues: "ALL_NEW"
      }));

      console.log(`Photographer updated for image ${body.id}:`, result.Attributes);

    } catch (error) {
      console.error("Error updating photographer:", error);
    }
  }
}; 