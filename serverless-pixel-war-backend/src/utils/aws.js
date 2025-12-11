const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { SNSClient } = require("@aws-sdk/client-sns");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { S3Client } = require("@aws-sdk/client-s3");
const { SecretsManagerClient } = require("@aws-sdk/client-secrets-manager");
const { ApiGatewayManagementApiClient } = require("@aws-sdk/client-apigatewaymanagementapi");

const region = process.env.REGION || "eu-west-3";

const ddb = new DynamoDBClient({ region });
const sns = new SNSClient({ region });
const sqs = new SQSClient({ region });
const s3 = new S3Client({ region });
const secrets = new SecretsManagerClient({ region });

// Factory for APIGW client (needs endpoint)
const getApiGatewayClient = (endpoint) => {
  return new ApiGatewayManagementApiClient({
    region,
    endpoint,
  });
};

module.exports = {
  ddb,
  sns,
  sqs,
  s3,
  secrets,
  getApiGatewayClient,
};

