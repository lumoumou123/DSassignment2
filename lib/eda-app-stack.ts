import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as iam from "aws-cdk-lib/aws-iam";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as path from "path";

import { Construct } from "constructs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EDAAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const imagesBucket = new s3.Bucket(this, "images", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    // DynamoDB table for storing image information
    const imagesTable = new dynamodb.Table(this, "ImagesTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "Images",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
    });
    
    // Output
    
    new cdk.CfnOutput(this, "bucketName", {
      value: imagesBucket.bucketName,
    });

      // Integration infrastructure

      const imageProcessQueue = new sqs.Queue(this, "img-created-queue", {
        receiveMessageWaitTime: cdk.Duration.seconds(10),
      });
      const newImageTopic = new sns.Topic(this, "NewImageTopic", {
        displayName: "New Image topic",
      }); 
      const mailerQ = new sqs.Queue(this, "mailer-queue", {
        receiveMessageWaitTime: cdk.Duration.seconds(10),
      });
      
      // Status Update Queue
      const statusUpdateQueue = new sqs.Queue(this, "status-update-queue", {
        receiveMessageWaitTime: cdk.Duration.seconds(10),
      });
  
  // Lambda functions

  const processImageFn = new lambdanode.NodejsFunction(
    this,
    "ProcessImageFn",
    {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/processImage.ts`,
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
      environment: {
        IMAGE_TABLE_NAME: imagesTable.tableName,
      },
    }
  );
  const mailerFn = new lambdanode.NodejsFunction(this, "mailer-function", {
    runtime: lambda.Runtime.NODEJS_16_X,
    memorySize: 1024,
    timeout: cdk.Duration.seconds(3),
    entry: `${__dirname}/../lambdas/mailer.ts`,
  });
  
  // Status Update Lambda
  const updateStatusFn = new lambdanode.NodejsFunction(
    this,
    "UpdateStatusFn",
    {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/updateStatus.ts`,
      timeout: cdk.Duration.seconds(15),
      memorySize: 128,
      environment: {
        IMAGE_TABLE_NAME: imagesTable.tableName,
        STATUS_UPDATE_TOPIC_ARN: newImageTopic.topicArn,
      },
    }
  );

  // Create Filter Lambda
  const filterImagesFn = new lambdanode.NodejsFunction(this, 'FilterImagesFn', {
    runtime: lambda.Runtime.NODEJS_22_X,
    entry: path.join(__dirname, '../lambdas/filterImages.ts'),
    handler: 'handler',
    environment: {
      IMAGE_TABLE_NAME: imagesTable.tableName,
    },
  });

  // Create API Gateway
  const api = new apigateway.RestApi(this, 'ImageFilterApi', {
    restApiName: 'Image Filter Service',
    defaultCorsPreflightOptions: {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS
    }
  });

  // Add /filter endpoint
  const filterEndpoint = api.root.addResource('filter');
  filterEndpoint.addMethod('POST', new apigateway.LambdaIntegration(filterImagesFn));

  // Topic subscriptions
  newImageTopic.addSubscription(new subs.SqsSubscription(mailerQ));

  newImageTopic.addSubscription(
    new subs.SqsSubscription(imageProcessQueue)
  );
  
  // Add subscription for status updates with filter policy
  newImageTopic.addSubscription(
    new subs.SqsSubscription(statusUpdateQueue, {
      filterPolicy: {
        messageType: sns.SubscriptionFilter.stringFilter({
          allowlist: ["STATUS_UPDATE"]
        })
      }
    })
  );

  // S3 --> SNS
  imagesBucket.addEventNotification(
    s3.EventType.OBJECT_CREATED,
    new s3n.SnsDestination(newImageTopic)
  );


 // SQS --> Lambda connections

 const newImageMailEventSource = new events.SqsEventSource(mailerQ, {
  batchSize: 5,
  maxBatchingWindow: cdk.Duration.seconds(5),
}); 

 const newImageEventSource = new events.SqsEventSource(imageProcessQueue, {
  batchSize: 5,
  maxBatchingWindow: cdk.Duration.seconds(5),
});

 // Status update event source
 const statusUpdateEventSource = new events.SqsEventSource(statusUpdateQueue, {
  batchSize: 5,
  maxBatchingWindow: cdk.Duration.seconds(5),
});

  // Connect event sources to Lambdas
  mailerFn.addEventSource(newImageMailEventSource);
  processImageFn.addEventSource(newImageEventSource);
  updateStatusFn.addEventSource(statusUpdateEventSource);

  // Permissions
  
  mailerFn.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail",
      ],
      resources: ["*"],
    })
  );

  imagesBucket.grantRead(processImageFn);
  
  // Grant DynamoDB permissions
  imagesTable.grantWriteData(processImageFn);
  imagesTable.grantReadWriteData(updateStatusFn);
  
  // Grant SNS publish permissions to update status Lambda
  newImageTopic.grantPublish(updateStatusFn);

  // Grant Lambda permissions to access DynamoDB
  imagesTable.grantReadData(filterImagesFn);

  // Output
  
  new cdk.CfnOutput(this, "imagesBucketNameOutput", {
    value: imagesBucket.bucketName,
  });
  
  // Output the SNS topic ARN for CLI testing
  new cdk.CfnOutput(this, "snsTopic", {
    value: newImageTopic.topicArn,
  });

  }
  
}
