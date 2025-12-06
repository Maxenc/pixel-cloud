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
        UpdateExpression: "SET #status = :status REMOVE #pausedAt",
        ExpressionAttributeNames: {
          "#status": "status",
          "#pausedAt": "pausedAt",
        },
        ExpressionAttributeValues: {
          ":status": { S: "RUNNING" },
        },
      })
    );

    await sns.send(
      new PublishCommand({
        TopicArn: process.env.SESSION_EVENTS_TOPIC_ARN,
        Message: JSON.stringify({
          type: "session.resumed",
          canvasId,
          triggeredBy: effectiveUserId,
          timestamp: new Date().toISOString(),
        }),
      })
    );

    return success({ message: "Session resumed" });
  } catch (e) {
    console.error(e);
    return error(500, "Internal Server Error");
  }
};

module.exports = { handler };

