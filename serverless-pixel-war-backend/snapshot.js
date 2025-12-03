const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const crypto = require("crypto");

const REGION = process.env.AWS_REGION || process.env.REGION;
const ADMIN_ID = process.env.SNAPSHOT_ADMIN_ID;
const REQUEST_TOPIC_ARN = process.env.SNAPSHOT_REQUEST_TOPIC_ARN;

const sns = new SNSClient({ region: REGION });

const handler = async (event) => {
  try {
    const payload = parsePayload(event.body);
    authorize(payload.userId);

    const request = {
      requestId: crypto.randomUUID(),
      requestedBy: payload.userId,
      requestedAt: new Date().toISOString(),
      callbackUrl: payload.callbackUrl,
    };

    await sns.send(
      new PublishCommand({
        TopicArn: REQUEST_TOPIC_ARN,
        Message: JSON.stringify(request),
      })
    );

    return {
      statusCode: 202,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "pending",
        requestId: request.requestId,
      }),
    };
  } catch (error) {
    console.error("Snapshot request error", error);
    const statusCode = error.statusCode || 400;
    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: error.message || "Snapshot failed" }),
    };
  }
};

function parsePayload(rawBody) {
  if (!rawBody) {
    throw buildError(400, "Payload manquant");
  }
  try {
    const data = JSON.parse(rawBody);
    return {
      userId: data.userId ?? data.user?.id,
      callbackUrl: data.callbackUrl,
    };
  } catch {
    throw buildError(400, "Payload invalide");
  }
}

function authorize(userId) {
  if (!userId || userId !== ADMIN_ID) {
    throw buildError(403, "Accès refusé");
  }
}

function buildError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = { handler };
