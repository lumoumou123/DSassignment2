/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler, SQSEvent } from "aws-lambda";
import {
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client();
const dynamoClient = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(dynamoClient);
// Use environment variable for table name
const IMAGE_TABLE_NAME = process.env.IMAGE_TABLE_NAME || "Images";

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log("Event ", JSON.stringify(event));
  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);        // Parse SQS message
    const snsMessage = JSON.parse(recordBody.Message); // Parse SNS message

    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        // Object key may have spaces or unicode non-ASCII characters.
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        let origimage = null;
        try {
          // Download the image from the S3 source bucket.
          const params: GetObjectCommandInput = {
            Bucket: srcBucket,
            Key: srcKey,
          };
          origimage = await s3.send(new GetObjectCommand(params));
          
          // Extract image metadata
          const metadata = origimage.Metadata || {};
          const contentType = origimage.ContentType;
          const size = origimage.ContentLength;
          
          // Create image record
          const imageRecord = {
            id: uuidv4(),
            s3Key: srcKey,
            bucket: srcBucket,
            uploadedAt: new Date().toISOString(),
            size: size,
            contentType: contentType,
            metadata: metadata,
            status: "pending", // Initial status
            photographer: metadata.photographer || "unknown"
          };
          
          console.log(`Storing image record to DynamoDB table: ${IMAGE_TABLE_NAME}`);
          
          // Store to DynamoDB
          await docClient.send(new PutCommand({
            TableName: IMAGE_TABLE_NAME,
            Item: imageRecord
          }));
          
          console.log(`Successfully logged image: ${srcKey} with ID: ${imageRecord.id}`);
          
        } catch (error) {
          console.error("Error processing/logging image:", error);
          // Log the error but continue processing other records
          // You might want to implement a dead-letter queue for failed records
        }
      }
    }
  }
  
  // Lambda SQS handlers don't need to return anything
};

