# Distributed Systems - Event-Driven Architecture Photo Processing

__Name:__ Hao ran lu



## Project Overview

This project implements a serverless event-driven architecture on AWS for processing images and metadata. The system allows photographers to upload images to S3 storage and processes them automatically through a series of Lambda functions triggered by events.

## Features Status

__Feature:__
+ Photographer:
  + Log new Images - Completed & Tested
  + Metadata updating - Completed & Tested
  + Invalid image removal - Completed & Tested
  + Status Update Mailer - Completed & Tested
+ Moderator:
  + Status updating - Completed & Tested
  + Filtering - Completed & Tested
  + Messaging - Completed & Tested

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
  - Moderators can review and approve/reject images via AWS CLI
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

- **Messaging (10 marks)**
  - Message-based communication between components
  - SNS/SQS infrastructure with filtering
  - Event-driven architecture for scalability

## AWS CLI Usage

The project now supports AWS CLI for various operations:

### Invalid Image Removal
To mark an image as invalid or remove it, use AWS CLI to send a message to the SNS topic. The message should include:
- Image ID
- Action type (MARK_INVALID)
- Message type attribute for invalid image handling

### Update Photographer Information
To update a photographer's information, use AWS CLI to send a message containing:
- Image ID
- New photographer email
- Message type attribute for photographer updates

### Status Updates
Moderators can use AWS CLI to submit review decisions. Each update includes:
- Image ID
- Status (Pass/Reject)
- Date
- Optional reason for the decision

## Filtering Feature

The Filtering feature provides a RESTful API endpoint for searching images based on:
- Date Range
- Status
- Photographer information

The API supports:
- Single criteria filtering
- Combined criteria filtering
- Pagination and sorting
- Metadata inclusion in results

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

1. Install dependencies
2. Configure AWS environment
3. Deploy the stack using CDK
4. Test functionality by uploading images to S3

## Metadata Update Feature

The Metadata Update feature supports updating:
- Image captions
- Date information
- Photographer names

Updates are processed through:
1. AWS CLI message submission
2. SNS/SQS message routing
3. Lambda processing
4. DynamoDB record updates
5. Modification timestamp tracking




