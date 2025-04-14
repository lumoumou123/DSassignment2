  # DSassignment2 - Event-Driven Architecture Photo Processing

## Project Overview

This project implements a serverless event-driven architecture on AWS for processing images and metadata. The system allows photographers to upload images to S3 storage and processes them automatically through a series of Lambda functions triggered by events.

## Architecture

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

- **Metadata updating (10 marks)**
  - Update image metadata such as caption, date, and photographer name
  - Changes are processed through SNS/SQS and Lambda
  - Uses message filtering for efficient processing

- **Invalid image removal (10 marks)**
  - Remove invalid or problematic images from S3
  - Update or delete corresponding DynamoDB records
  - DLQ-based architecture for handling invalid images

- **Messaging (10 marks)**
  - Message-based communication between components
  - SNS/SQS infrastructure with filtering
  - Event-driven architecture for scalability

### Future Enhancements
- Add front-end interface for easier management
- Implement additional image processing capabilities
- Add batch processing for high volumes
- Enhance security features and access controls

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

## Invalid Image Removal Feature

The Invalid Image Removal feature enables the system to handle and remove images that are invalid, corrupted, or violate guidelines.

### How it works

1. **Detection**: Invalid images are identified either through automated processes or manual review
2. **Message Format**:
   ```json
   {
     "id": "image-id-string",
     "reason": "Invalid image format or content",
     "action": "MARK_INVALID or DELETE_RECORD"
   }
   ```

3. **Processing**: The Remove Invalid Image Lambda processes these messages:
   - Retrieves the image record from DynamoDB
   - Deletes the original file from S3 bucket
   - Either marks the record as "invalid" or completely removes it from DynamoDB

4. **Architecture**: Uses a dedicated Dead Letter Queue (DLQ) and Lambda function, with messages filtered by the "INVALID_IMAGE" message type

### Testing the Feature

You can test the Invalid Image Removal feature using the provided testing tool:

1. Deploy the application
2. Obtain the SNS Topic ARN from the CloudFormation outputs
3. Set the environment variable: `export TOPIC_ARN=<your-topic-arn>`
4. Run the test tool:
   ```
   npx ts-node tools/removeInvalidImage.ts <imageId> [deleteRecord]
   ```
   - Set `deleteRecord` to "true" if you want to completely remove the record from DynamoDB

Example:
```bash
npx ts-node tools/removeInvalidImage.ts 7e6d23d2-0d27-44cc-8b6c-efd8b2782c5c
```

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
  - Invalid image removal
  - Comprehensive messaging
- Add front-end for easier management
- Implement additional image processing capabilities

## Metadata Update Feature

The Metadata Update feature allows updating image metadata such as captions, dates, and photographer names.

### Message Format

The metadata update messages follow a specific format:

1. **Message Body**:
   ```json
   {
     "id": "image1.jpeg",
     "value": "Olympic 100m final - 2024"
   }
   ```

2. **Message Attributes**:
   ```json
   {
     "metadata_type": {
       "DataType": "String",
       "StringValue": "Caption"
     }
   }
   ```

### Valid Metadata Types

The system supports three types of metadata updates:
- `Caption`: Image caption or description
- `Date`: Image date in string format
- `name`: Photographer's name

### Testing the Feature

You can test the Metadata Update feature using the provided testing tool:

1. Deploy the application
2. Set the environment variable: `export TOPIC_ARN=<your-topic-arn>`
3. Run the test tool:
   ```bash
   ts-node tools/updateMetadata.ts <imageId> <Caption|Date|name> "value"
   ```

Example:
```bash
ts-node tools/updateMetadata.ts image1.jpeg Caption "Olympic 100m final - 2024"
ts-node tools/updateMetadata.ts image1.jpeg Date "2024-04-15"
ts-node tools/updateMetadata.ts image1.jpeg name "John Smith"
```

### Implementation Details

The metadata update process follows this workflow:
1. Updates are submitted via CLI tool
2. Messages are published to SNS with appropriate attributes
3. A dedicated SQS queue receives metadata update messages
4. The updateMetadata Lambda processes these messages
5. DynamoDB records are updated with new metadata
6. Each update includes a timestamp of the modification


