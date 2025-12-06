const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { PublishCommand } = require("@aws-sdk/client-sns");
const { ddb, sns } = require("../../utils/aws");
const { isAdmin, parseBody, success, error } = require("../../utils/common");

const handler = async (event) => {
  const body = parseBody(event);
  const userId = body.userId;
  const canvasId = body.canvasId || "main";

  const effectiveUserId =
    event.requestContext?.authorizer?.jwt?.claims?.sub || userId;

  if (!(await isAdmin(effectiveUserId))) {
    return error(403, "Unauthorized");
  }

  try {
    await ddb.send(
      new UpdateItemCommand({
        TableName: process.env.GAME_SESSION_TABLE,
        Key: { canvasId: { S: canvasId } },
        UpdateExpression: "SET #status = :status, #pausedAt = :pausedAt",
        ExpressionAttributeNames: {
          "#status": "status",
          "#pausedAt": "pausedAt",
        },
        ExpressionAttributeValues: {
          ":status": { S: "PAUSED" },
          ":pausedAt": { S: new Date().toISOString() },
        },
      })
    );

    await sns.send(
      new PublishCommand({
        TopicArn: process.env.SESSION_EVENTS_TOPIC_ARN,
        Message: JSON.stringify({
          type: "session.paused",
          canvasId,
          triggeredBy: effectiveUserId,
          timestamp: new Date().toISOString(),
        }),
      })
    );

    return success({ message: "Session paused" });
  } catch (e) {
    console.error(e);
    return error(500, "Internal Server Error");
  }
};

module.exports = { handler };

