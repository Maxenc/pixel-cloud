const {
  GetItemCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { ddb, sqs } = require("../../utils/aws");
const { parseBody, success, error } = require("../../utils/common");

const MAX_WIDTH = parseInt(process.env.BOARD_WIDTH || "256");
const MAX_HEIGHT = parseInt(process.env.BOARD_HEIGHT || "256");

const minuteBucket = () => new Date().toISOString().slice(0, 16);

const enforceRateLimit = async (userId) => {
  const now = Math.floor(Date.now() / 1000);
  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: process.env.RATE_LIMIT_TABLE,
        Key: {
          userId: { S: userId },
          bucket: { S: minuteBucket() },
        },
        UpdateExpression: "ADD #count :inc SET #ttl = :ttl",
        ExpressionAttributeNames: {
          "#count": "count",
          "#ttl": "ttl",
        },
        ExpressionAttributeValues: {
          ":inc": { N: "1" },
          ":ttl": { N: (now + 120).toString() },
          ":max": { N: process.env.MAX_PIXELS_PER_MINUTE || "20" },
        },
        ConditionExpression: "attribute_not_exists(#count) OR #count < :max",
      })
    );
    return true;
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      return false;
    }
    throw err;
  }
};

const handler = async (event) => {
  const body = parseBody(event);
  const { x, y, color, userId, username } = body;

  if (
    x === undefined ||
    y === undefined ||
    !color ||
    x < 0 ||
    x >= MAX_WIDTH ||
    y < 0 ||
    y >= MAX_HEIGHT
  ) {
    return error(400, "Invalid pixel coordinates or color");
  }

  const canvasId = "main";
  const actorId = userId || "anonymous";

  try {
    const sessionResult = await ddb.send(
      new GetItemCommand({
        TableName: process.env.GAME_SESSION_TABLE,
        Key: { canvasId: { S: canvasId } },
      })
    );

    const status = sessionResult.Item?.status?.S || "STOPPED";
    if (status !== "RUNNING") {
      return error(403, `Canvas is ${status}, cannot draw.`);
    }

    const withinQuota = await enforceRateLimit(actorId);
    if (!withinQuota) {
      return error(429, "Rate limit exceeded");
    }

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.DRAW_QUEUE_URL,
        MessageBody: JSON.stringify({
          x,
          y,
          color,
          userId: actorId,
          username,
          canvasId,
          timestamp: new Date().toISOString(),
          rateLimitChecked: true,
        }),
      })
    );

    return success({ message: "Pixel queued", status: "queued" }, 202);
  } catch (e) {
    console.error("Draw Proxy Error:", e);
    return error(500, "Internal Server Error");
  }
};

module.exports = { handler };
