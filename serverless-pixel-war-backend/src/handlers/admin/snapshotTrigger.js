const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { sqs } = require("../../utils/aws");
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
  const callbackUrl = body.callbackUrl;

  if (!(await isAdmin(userId))) {
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
