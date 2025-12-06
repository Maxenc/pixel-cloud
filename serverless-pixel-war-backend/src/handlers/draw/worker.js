const {
  UpdateItemCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { PublishCommand } = require("@aws-sdk/client-sns");
const { ddb, sns } = require("../../utils/aws");

const MAX_PIXELS_PER_MINUTE = parseInt(
  process.env.MAX_PIXELS_PER_MINUTE || "20"
);

const handler = async (event) => {
  const records = event.Records || [];

  for (const record of records) {
    try {
      const body = JSON.parse(record.body);
      const { x, y, color, userId, canvasId, timestamp, rateLimitChecked } =
        body;
      let authorName = "anonymous";
      if (userId && userId !== "anonymous") {
        try {
          authorName = body.username || userId;
        } catch (e) {
          console.warn("Failed to resolve username", e);
        }
      }

      const now = Math.floor(Date.now() / 1000);
      const minuteBucket = new Date().toISOString().slice(0, 16);

      if (!rateLimitChecked) {
        try {
          await ddb.send(
            new UpdateItemCommand({
              TableName: process.env.RATE_LIMIT_TABLE,
              Key: {
                userId: { S: userId },
                bucket: { S: minuteBucket },
              },
              UpdateExpression: "ADD #count :inc SET #ttl = :ttl",
              ExpressionAttributeNames: {
                "#count": "count",
                "#ttl": "ttl",
              },
              ExpressionAttributeValues: {
                ":inc": { N: "1" },
                ":ttl": { N: (now + 120).toString() },
                ":max": { N: MAX_PIXELS_PER_MINUTE.toString() },
              },
              ConditionExpression:
                "attribute_not_exists(#count) OR #count < :max",
            })
          );
        } catch (err) {
          if (err.name === "ConditionalCheckFailedException") {
            console.warn(`Rate limit exceeded for user ${userId}`);
            continue;
          }
          throw err;
        }
      }

      const pixelId = `${x}#${y}`;
      await ddb.send(
        new PutItemCommand({
          TableName: process.env.PIXEL_TABLE,
          Item: {
            canvasId: { S: canvasId },
            pixelId: { S: pixelId },
            x: { N: x.toString() },
            y: { N: y.toString() },
            color: { S: color },
            userId: { S: userId },
            username: { S: authorName },
            lastUpdated: { S: timestamp },
          },
        })
      );

      await sns.send(
        new PublishCommand({
          TopicArn: process.env.PIXEL_EVENTS_TOPIC_ARN,
          Message: JSON.stringify({
            type: "pixel.drawn",
            canvasId,
            x,
            y,
            color,
            userId,
            username: authorName,
            timestamp,
          }),
        })
      );

      await ddb.send(
        new UpdateItemCommand({
          TableName: process.env.GAME_SESSION_TABLE,
          Key: { canvasId: { S: canvasId } },
          UpdateExpression: "ADD pixelCount :inc",
          ExpressionAttributeValues: { ":inc": { N: "1" } },
        })
      );
    } catch (e) {
      console.error("Error processing record:", e);
      throw e;
    }
  }
};

module.exports = { handler };
