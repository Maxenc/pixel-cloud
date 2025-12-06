const { GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { ddb } = require("./aws");

const checkInternalSecret = (event) => {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const headers = event.headers || {};
  const headerValue = headers["x-internal-secret"] || headers["X-Internal-Secret"];
  return headerValue === secret;
};

const getSession = async (event) => {
  // 1. Extract sessionId from Headers (Authorization: Bearer ...) or Query String
  let sessionId = null;

  const headers = event.headers || {};
  // Handle case-insensitive headers
  const authHeader = headers.authorization || headers.Authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    sessionId = authHeader.substring(7);
  }

  if (!sessionId && event.queryStringParameters && event.queryStringParameters.sessionId) {
    sessionId = event.queryStringParameters.sessionId;
  }

  if (!sessionId) {
    return null;
  }

  // 2. Query DynamoDB
  try {
    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.SESSIONS_TABLE,
      Key: { sessionId: { S: sessionId } }
    }));

    if (!result.Item) {
      return null;
    }

    const expiresAt = parseInt(result.Item.expiresAt.N);
    if (Date.now() / 1000 > expiresAt) {
      return null;
    }

    return {
      type: 'session',
      sessionId: result.Item.sessionId.S,
      userId: result.Item.userId.S,
      username: result.Item.username.S,
    };
  } catch (e) {
    console.error("Error getting session:", e);
    return null;
  }
};

module.exports = { getSession, checkInternalSecret };
