const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { sqs } = require("../../utils/aws");
const { isAdmin, parseBody, success, error } = require("../../utils/common");

const handler = async (event) => {
  const body = parseBody(event);
  const userId = body.userId;
  const canvasId = body.canvasId || "main";
  const callbackUrl = body.callbackUrl;

  const effectiveUserId =
    event.requestContext?.authorizer?.jwt?.claims?.sub || userId;

  if (!(await isAdmin(effectiveUserId))) {
    return error(403, "Unauthorized");
  }

  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.SNAPSHOT_QUEUE_URL,
        MessageBody: JSON.stringify({
          canvasId,
          triggeredBy: effectiveUserId,
          timestamp: new Date().toISOString(),
          callbackUrl: callbackUrl || null,
        }),
      })
    );

    return success({ message: "Snapshot queued" });
  } catch (e) {
    console.error(e);
    return error(500, "Internal Server Error");
  }
};

module.exports = { handler };
