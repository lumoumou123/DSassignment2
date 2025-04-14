import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const IMAGE_TABLE_NAME = process.env.IMAGE_TABLE_NAME || "Images";

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error("Usage: npx ts-node tools/updatePhotographerEmail.ts <imageId> [email]");
      console.error("If no email is provided, will use '20109114@mail.wit.ie'");
      process.exit(1);
    }
    
    const [imageId, email = '20109114@mail.wit.ie'] = args;
    
    // 直接更新DynamoDB中的photographer字段
    const dynamoClient = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    
    console.log(`Updating photographer email for image ${imageId} to ${email}`);
    
    // 更新DynamoDB
    const result = await docClient.send(new UpdateCommand({
      TableName: IMAGE_TABLE_NAME,
      Key: { id: imageId },
      UpdateExpression: "set photographer = :photographer, lastUpdated = :lastUpdated",
      ExpressionAttributeValues: {
        ":photographer": email,
        ":lastUpdated": new Date().toISOString()
      },
      ReturnValues: "ALL_NEW"
    }));
    
    console.log(`Photographer email updated successfully for image ${imageId}`);
    console.log("Updated item:", result.Attributes);
    
  } catch (err) {
    console.error("Error updating photographer email:", err);
    process.exit(1);
  }
}

// 如果没有提供参数，扫描所有图像并批量更新
async function updateAllImages() {
  if (process.argv.length > 2) {
    return main();
  }
  
  console.log("No image ID provided, updating all images...");
  const email = '20109114@mail.wit.ie';
  
  try {
    const dynamoClient = new DynamoDBClient({});
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    
    // 获取所有图像
    const scanResult = await docClient.send(new ScanCommand({
      TableName: IMAGE_TABLE_NAME
    }));
    
    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log("No images found in the database");
      return;
    }
    
    console.log(`Found ${scanResult.Items.length} images, updating photographer email to ${email}...`);
    
    // 更新每个图像
    for (const item of scanResult.Items) {
      const result = await docClient.send(new UpdateCommand({
        TableName: IMAGE_TABLE_NAME,
        Key: { id: item.id },
        UpdateExpression: "set photographer = :photographer, lastUpdated = :lastUpdated",
        ExpressionAttributeValues: {
          ":photographer": email,
          ":lastUpdated": new Date().toISOString()
        },
        ReturnValues: "ALL_NEW"
      }));
      
      console.log(`Updated image ${item.id}`);
    }
    
    console.log(`All images updated successfully with photographer email: ${email}`);
    
  } catch (err) {
    console.error("Error updating all images:", err);
    process.exit(1);
  }
}

updateAllImages(); 