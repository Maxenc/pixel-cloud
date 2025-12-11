const {
  GetItemCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { ddb, sqs } = require("../../utils/aws");
const { parseBody, success, error } = require("../../utils/common");
const { getSession, checkInternalSecret } = require("../../utils/security");

const MAX_WIDTH = parseInt(process.env.BOARD_WIDTH || "256");
const MAX_HEIGHT = parseInt(process.env.BOARD_HEIGHT || "256");
const MAX_PIXELS_PER_MINUTE = parseInt(
  process.env.MAX_PIXELS_PER_MINUTE || "20"
);

const minuteBucket = () => new Date().toISOString().slice(0, 16);

const enforceRateLimit = async (userId) => {
  const now = Math.floor(Date.now() / 1000);
  const bucket = minuteBucket();

  if (!userId) return false;

  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: process.env.RATE_LIMIT_TABLE,
        Key: {
          userId: { S: userId },
          bucket: { S: bucket },
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
        ConditionExpression: "attribute_not_exists(#count) OR #count < :max",
      })
    );
    return true;
  } catch (err) {
    if (
      err.name === "ConditionalCheckFailedException" ||
      err.Code === "ConditionalCheckFailedException"
    ) {
      console.warn(
        `Rate limit exceeded for user ${userId} in bucket ${bucket}`
      );
      return false;
    }
    throw err;
  }
};

const handler = async (event) => {
  // 1. Authenticate
  let userId, username;
  const session = await getSession(event);

  if (session) {
    userId = session.userId;
    username = session.username;
  } else if (checkInternalSecret(event)) {
    const body = parseBody(event);
    userId = body.userId;
    username = body.username;
  } else {
    return error(401, "Unauthorized");
  }

  // 2. Parse and Validate Body
  const body = parseBody(event);
  const { x, y, color } = body;

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

    const withinQuota = await enforceRateLimit(userId);
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
          userId,
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
