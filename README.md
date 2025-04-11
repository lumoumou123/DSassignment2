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
  
- **Status updating (10 marks)**
  - Moderators can review and approve/reject images via CLI
  - Updates image status in DynamoDB
  - Notifies photographers of status changes

- **Filtering (40 marks)**
  - Filter images by date range, status, and photographer
  - RESTful API endpoint for querying images
  - Supports combined filtering criteria
  - Returns filtered results with metadata

### In Progress Features
- **Metadata updating (10 marks)**
- **Invalid image removal (10 marks)**
- **Messaging (10 marks)**

## Status Update Feature

The Status Update feature allows moderators to review and approve or reject images.

### How it works

1. **Moderator Review**: Moderators use a CLI to submit review decisions
2. **Message Format**:
   ```json
   {
     "id": "image-id-string",
     "date": "01/05/2025",
     "update": {
       "status": "Pass/Reject",
       "reason": "Reason for decision"
     }
   }
   ```

3. **Processing**: The Update Status Lambda processes these messages, updating the image status in DynamoDB
4. **Notification**: Photographers receive email notifications about status changes

### Testing the Feature

You can test the Status Update feature using the provided testing tool:

1. Deploy the application
2. Obtain the SNS Topic ARN from the CloudFormation outputs
3. Set the environment variable: `export TOPIC_ARN=<your-topic-arn>`
4. Run the test tool:
   ```
   ts-node tools/sendStatusUpdate.ts <imageId> <Pass|Reject> "Optional reason"
   ```

## Filtering Feature

The Filtering feature provides a flexible way to search and retrieve images based on various criteria through a RESTful API endpoint.

### Key Features

1. **Multiple Filter Criteria**
   - Date Range: Search images by upload date
   - Status: Filter by image processing status
   - Photographer: Search by photographer information

2. **API Integration**
   - RESTful API endpoint for easy integration
   - JSON-based request and response format
   - Supports combined filter criteria

3. **Response Details**
   - Returns matching image records with metadata
   - Includes total count of matching items
   - Provides search criteria confirmation

### Testing

The filtering functionality can be tested using:
- Postman
- cURL
- Any HTTP client that supports POST requests

For detailed examples and demonstrations, please refer to the video documentation.

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

### Status Updating
The Status Update feature uses the following workflow:
1. Moderators submit decisions via CLI or testing tool
2. Messages are published to SNS with message attributes for filtering
3. A dedicated SQS queue receives status update messages
4. The updateStatus Lambda processes these messages and updates DynamoDB
5. A notification is sent to the photographer via email

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
  - Filtering (40 marks)
  - Comprehensive messaging
- Add front-end for easier management
- Implement additional image processing capabilities


