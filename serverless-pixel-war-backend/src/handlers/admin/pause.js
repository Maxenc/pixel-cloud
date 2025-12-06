const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { PublishCommand } = require("@aws-sdk/client-sns");
const { ddb, sns } = require("../../utils/aws");
const { isAdmin, parseBody, success, error } = require("../../utils/common");
const { getSession, checkInternalSecret } = require("../../utils/security");

const handler = async (event) => {
  let userId;
  const session = await getSession(event);

  if (session) {
    userId = session.userId;
  } else if (checkInternalSecret(event)) {
    const body = parseBody(event);
    userId = body.userId;
  } else {
    return error(401, "Unauthorized");
  }

  const body = parseBody(event);
  const canvasId = body.canvasId || "main";

  if (!(await isAdmin(userId))) {
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

