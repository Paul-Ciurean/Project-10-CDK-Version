import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';

export class Project10CdkVersionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DEFINE THE S3 BUCKETS

    // Frontend Bucket
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: 'my-frontend-bucket-cinema-groot',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // Backend Bucket
    const backendBucket = new s3.Bucket(this, 'BackendBucket', {
      bucketName: 'my-backend-bucket-cinema-groot',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // DEFINE THE CLOUDFRONT DISTRIBUTION

    const oac = new cloudfront.S3OriginAccessControl(this, 'MyOAC', {
      signing: cloudfront.Signing.SIGV4_ALWAYS
    });
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(frontendBucket, {
        originAccessControl: oac
      }
    )
    new cloudfront.Distribution(this, 'myDist', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: s3Origin
      },
    });

    // DEFINE THE DYNAMODB TABLE

    const dynamoDB = new dynamodb.Table(this, 'MyDynamoDBTable', {
      tableName: 'my-dynamodb-table-cinema-groot',
      partitionKey: { name: 'movies', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // DEFINE THE SNS TOPIC

    const snsTopic = new sns.Topic(this, 'MySNSTopic', {
      topicName: 'my-sns-topic-cinema-groot',
    });

    // DEFINE THE LAMBDA FUNCTIONS
    
    // Upload Function
    const uploadLambdaToDynamoDB = new lambda.Function(this, 'UploadLambdaToDynamoDB', {
      functionName: 'upload_lambda_to_dynamodb',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'upload-lambda-to-dynamodb.lambda_handler',
      code: lambda.Code.fromAsset('lambda/upload-lambda-to-dynamodb.zip'),
      environment: {
        TABLE_NAME: dynamoDB.tableName,
        SNS_TOPIC_ARN: snsTopic.topicArn,
      },
      logGroup: new logs.LogGroup(this, 'UploadLambdaLogGroup', {
        logGroupName: '/aws/lambda/upload_lambda',
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    const filter: s3.NotificationKeyFilter = { suffix: '.csv' };
    backendBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(uploadLambdaToDynamoDB), filter);

    // Search Function

    const searchLambda = new lambda.Function(this, 'SearchLambda', {
      functionName: 'search_lambda',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'search-lambda.lambda_handler',
      code: lambda.Code.fromAsset('lambda/search-lambda.zip'),
      environment: {
        TABLE_NAME: dynamoDB.tableName
      },
      logGroup: new logs.LogGroup(this, 'SearchLambdaLogGroup', {
        logGroupName: '/aws/lambda/search_lambda',
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Update Function 

    const updateLambda = new lambda.Function(this, 'UpdateLambda', {
      functionName: 'update_lambda',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'update-lambda.lambda_handler',
      code: lambda.Code.fromAsset('lambda/update-lambda.zip'),
      environment: {
        TABLE_NAME: dynamoDB.tableName
      },
      logGroup: new logs.LogGroup(this, 'UpdateLambdaLogGroup', {
        logGroupName: '/aws/lambda/update_lambda',
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // DEFINE THE API GATEWAY

    // Search API Gateway

    const searchApi = new apigateway.RestApi(this, 'SearchApi', {
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })

    const searchResource = searchApi.root.addResource('search_api');

    searchResource.addMethod('GET', new apigateway.LambdaIntegration(searchLambda),{
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    const searchDeployment = new apigateway.Deployment(this, 'SearchApiDeployment', {
      api: searchApi,
    });

    // Update API Gateway

    const updateApi = new apigateway.RestApi(this, 'UpdateApi', {
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    })

    const updateResource = updateApi.root.addResource('update_api');

    updateResource.addMethod('GET', new apigateway.LambdaIntegration(updateLambda),{
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
          },
          responseModels: {
            'application/json': apigateway.Model.EMPTY_MODEL,
          },
        },
      ],
    });

    const updateDeployment = new apigateway.Deployment(this, 'UpdateApiDeployment', {
      api: updateApi,
    });

    // DEFINE THE IAM POLICIES 

    searchLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "logs:CreateLogStream",
        "dynamodb:Scan",
        "dynamodb:Query",
        "logs:CreateLogGroup",
        "logs:PutLogEvents"
      ],
      effect: iam.Effect.ALLOW,
      resources: ['*'],
    }));

    updateLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "logs:CreateLogStream",
        "dynamodb:Scan",
        "dynamodb:UpdateItem",
        "dynamodb:PutItem",
        "logs:CreateLogGroup",
        "logs:PutLogEvents"
      ],
      effect: iam.Effect.ALLOW,
      resources: ['*'],
    }));

    uploadLambdaToDynamoDB.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "logs:CreateLogStream",
        "dynamodb:Scan",
        "dynamodb:BatchWriteItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "logs:CreateLogGroup",
        "logs:PutLogEvents"
      ],
      effect: iam.Effect.ALLOW,
      resources: ['*'],
    }));

    uploadLambdaToDynamoDB.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "s3:GetObject",
        "sns:Publish"
      ],
      effect: iam.Effect.ALLOW,
      resources: [
        snsTopic.topicArn,
        backendBucket.bucketArn + '/*'],
    }));
  }
}
