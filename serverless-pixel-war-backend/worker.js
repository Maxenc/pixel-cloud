const {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const region = process.env.AWS_REGION || process.env.REGION;
const ddb = new DynamoDBClient({ region });
const sns = new SNSClient({ region });
const MAX_PER_MINUTE = Number(process.env.MAX_PIXELS_PER_MINUTE || "20");
const PIXEL_TOPIC_ARN = process.env.PIXEL_TOPIC_ARN;

const handler = async (event) => {
  console.log("Processing batch of messages:", event.Records?.length || 0);

  for (const record of event.Records || []) {
    let body;

    try {
      body = JSON.parse(record.body);
      console.log("Processing pixel:", body);
    } catch (e) {
      console.error("Invalid SQS message body, skipping:", record.body);
      continue;
    }

    const user = body.user || "anonymous";
    const timestampIso = body.timestamp || new Date().toISOString();
    // bucket par minute : "YYYY-MM-DDTHH:MM"
    const minuteBucket = timestampIso.slice(0, 16);
    const nowTtl = Math.floor(Date.now() / 1000) + 60; // TTL 1 min

    // ---------- Rate limiting ----------
    try {
      await ddb.send(
        new UpdateItemCommand({
          TableName: process.env.RATE_LIMIT_TABLE,
          Key: {
            user_id: { S: user },
            bucket: { S: minuteBucket },
          },
          UpdateExpression: "ADD #count :inc SET #ttl = :ttl",
          ExpressionAttributeNames: {
            "#count": "count",
            "#ttl": "ttl",
          },
          ExpressionAttributeValues: {
            ":inc": { N: "1" },
            ":ttl": { N: String(nowTtl) },
            ":max": { N: String(MAX_PER_MINUTE) },
          },
          ConditionExpression: "attribute_not_exists(#count) OR #count < :max",
          ReturnValues: "UPDATED_NEW",
        })
      );

      console.log(`Rate-limit OK for user=${user}, bucket=${minuteBucket}`);
    } catch (err) {
      if (err.name === "ConditionalCheckFailedException") {
        console.warn(
          `Rate limit exceeded for user=${user} in bucket=${minuteBucket}, dropping pixel ${body.pixel_id}`
        );
        continue; // on n'écrit pas le pixel
      }
      console.error("Error updating rate limit table:", err);
      continue;
    }

    // ---------- Écriture du pixel ----------
    try {
      await ddb.send(
        new PutItemCommand({
          TableName: process.env.PIXEL_TABLE,
          Item: {
            pixel_id: { S: body.pixel_id },
            x: { N: String(body.x) },
            y: { N: String(body.y) },
            color: { S: body.color },
            user: { S: user },
            timestamp: { S: timestampIso },
          },
        })
      );

      console.log(`✅ Pixel ${body.pixel_id} stored in DynamoDB`);

      if (PIXEL_TOPIC_ARN) {
        await sns.send(
          new PublishCommand({
            TopicArn: PIXEL_TOPIC_ARN,
            Message: JSON.stringify({
              type: "pixel",
              payload: {
                pixel_id: body.pixel_id,
                x: body.x,
                y: body.y,
                color: body.color,
                user,
                timestamp: timestampIso,
              },
            }),
          })
        );
      }
    } catch (err) {
      console.error("❌ Error writing pixel to table:", err);
    }
  }

  return { statusCode: 200 };
};

module.exports = { handler };
