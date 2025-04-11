# DSassignment2 - Event-Driven Architecture Photo Processing

## Project Overview

This project implements a serverless event-driven architecture on AWS for processing images and metadata. The system allows photographers to upload images to S3 storage and processes them automatically through a series of Lambda functions triggered by events.

## Architecture

![Architecture Diagram](https://github.com/lumoumou123/DSassignment2/raw/main/images/architecture.png)

The architecture follows an event-driven pattern:

1. Photographers upload images to S3 bucket
2. S3 triggers events sent to SNS topic
3. SNS distributes messages to various SQS queues based on filters
4. Lambda functions consume messages from SQS queues
5. Images are processed, metadata stored in DynamoDB, and notifications sent via SES

## Features

### Implemented Features
- **Log new Images (10 marks)**
  - Lambda processes images uploaded to S3
  - Extracts metadata and stores in DynamoDB
  - Maintains image status tracking

- **Status Update Mailer (10 marks)**
  - Sends email notifications when new images are uploaded
  - Uses AWS SES for reliable email delivery

### In Progress Features
- **Metadata updating (10 marks)**
- **Invalid image removal (10 marks)**
- **Status updating (10 marks)**
- **Filtering (40 marks)**
- **Messaging (10 marks)**

## Implementation Details

### Log New Images
Images uploaded to S3 trigger an event that's sent to SNS and then to an SQS queue. A Lambda function (`processImage.ts`) consumes these messages, extracts image metadata, and stores the information in a DynamoDB table. Each image record includes:

- Unique ID
- S3 key and bucket
- Upload timestamp
- Image size and content type
- Status (initially set to "pending")
- Photographer information

### Status Update Mailer
The same S3 event also triggers an email notification via another Lambda function (`mailer.ts`). This function sends an email to notify stakeholders about the new image upload.

## Technology Stack

- **AWS Services**:
  - S3 (object storage)
  - Lambda (serverless compute)
  - SNS (pub/sub messaging)
  - SQS (message queues)
  - DynamoDB (NoSQL database)
  - SES (email service)
  
- **Development Tools**:
  - TypeScript
  - AWS CDK for infrastructure as code
  - AWS SDK for JavaScript/TypeScript

## Setup and Deployment

1. Install dependencies:
   ```
   npm install
   ```

2. Configure your AWS environment:
   ```
   aws configure
   ```

3. Deploy the stack:
   ```
   cdk deploy
   ```

4. Test the functionality by uploading an image to the created S3 bucket:
   ```
   aws s3 cp <image-path> s3://<bucket-name>/
   ```

## Future Work

- Complete the remaining features:
  - Metadata updating
  - Invalid image removal
  - Status updating and filtering
  - Comprehensive messaging
- Add front-end for easier management
- Implement additional image processing capabilities


