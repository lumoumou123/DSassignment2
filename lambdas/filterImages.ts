import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const dynamoClient = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.IMAGE_TABLE_NAME || 'Images';

interface FilterCriteria {
  dateRange?: {
    start: string;
    end: string;
  };
  status?: 'Pass' | 'Reject' | 'pending';
  photographer?: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log('Received filter request:', event);
    
    const criteria: FilterCriteria = JSON.parse(event.body || '{}');
    console.log('Filter criteria:', criteria);
    
    // Build DynamoDB query expression
    let filterExpressions: string[] = [];
    let expressionAttributeValues: any = {};
    let expressionAttributeNames: any = {};
    
    // Handle date range filter
    if (criteria.dateRange) {
      filterExpressions.push('#uploadedAt BETWEEN :startDate AND :endDate');
      expressionAttributeValues[':startDate'] = criteria.dateRange.start;
      expressionAttributeValues[':endDate'] = criteria.dateRange.end;
      expressionAttributeNames['#uploadedAt'] = 'uploadedAt';
      
      console.log('Date range filter:', {
        start: criteria.dateRange.start,
        end: criteria.dateRange.end
      });
    }
    
    // Handle status filter
    if (criteria.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = criteria.status;
      expressionAttributeNames['#status'] = 'status';
    }
    
    // Handle photographer filter
    if (criteria.photographer) {
      filterExpressions.push('#photographer = :photographer');
      expressionAttributeValues[':photographer'] = criteria.photographer;
      expressionAttributeNames['#photographer'] = 'photographer';
    }
    
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: filterExpressions.length > 0 
        ? filterExpressions.join(' AND ')
        : undefined,
      ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0
        ? expressionAttributeValues
        : undefined,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0
        ? expressionAttributeNames
        : undefined
    };

    console.log('DynamoDB query params:', JSON.stringify(params, null, 2));
    
    const result = await docClient.send(new ScanCommand(params));
    console.log('DynamoDB result:', JSON.stringify(result.Items, null, 2));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        items: result.Items,
        count: result.Count,
        criteria: criteria
      })
    };
    
  } catch (error) {
    console.error('Error filtering images:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to filter images',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 