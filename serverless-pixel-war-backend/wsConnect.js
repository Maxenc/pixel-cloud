const {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  ScanCommand,
} = require("@aws-sdk/client-dynamodb");

const REGION = process.env.REGION || "eu-west-3";
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || "pixel_connections";

const dynamodb = new DynamoDBClient({ region: REGION });

const handler = async (event) => {
  const connectionId = event.requestContext?.connectionId;
  const domainName = event.requestContext?.domainName;
  const stage = event.requestContext?.stage;
  if (!connectionId || !domainName || !stage) {
    return { statusCode: 400, body: "Missing connection metadata" };
  }

  const clientId =
    extractValue(event, "clientId") ||
    extractValue(event, "connectionId") ||
    connectionId;
  const sessionId = extractValue(event, "sessionId");

  try {
    await removeExistingConnections({ clientId, sessionId });
    await upsertConnection({
      connectionId,
      clientId,
      sessionId,
      domainName,
      stage,
    });
    return { statusCode: 200, body: "connected" };
  } catch (error) {
    console.error("wsConnect error", error);
    return { statusCode: 500, body: "Failed to connect" };
  }
};

async function upsertConnection({
  connectionId,
  clientId,
  sessionId,
  domainName,
  stage,
}) {
  const now = Math.floor(Date.now() / 1000);

  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: CONNECTIONS_TABLE,
        Item: {
          connectionId: { S: connectionId },
          createdAt: { N: String(now) },
          lastSeenAt: { N: String(now) },
          clientId: { S: clientId },
          domainName: { S: domainName },
          stage: { S: stage },
          ...(sessionId ? { sessionId: { S: sessionId } } : {}),
        },
        ConditionExpression: "attribute_not_exists(connectionId)",
      })
    );
  } catch (error) {
    if (error.name !== "ConditionalCheckFailedException") throw error;
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId: { S: connectionId } },
        UpdateExpression:
          "SET lastSeenAt = :now, clientId = :clientId, domainName = :domainName, stage = :stage" +
          (sessionId ? ", sessionId = :sessionId" : ""),
        ExpressionAttributeValues: {
          ":now": { N: String(now) },
          ":clientId": { S: clientId },
          ":domainName": { S: domainName },
          ":stage": { S: stage },
          ...(sessionId ? { ":sessionId": { S: sessionId } } : {}),
        },
      })
    );
  }
}

async function removeExistingConnections({ clientId, sessionId }) {
  const seen = new Set();
  if (clientId) await removeByAttribute("clientId", clientId, seen);
  if (sessionId) await removeByAttribute("sessionId", sessionId, seen);
}

async function removeByAttribute(attribute, value, seen) {
  let exclusiveStartKey;
  do {
    const response = await dynamodb.send(
      new ScanCommand({
        TableName: CONNECTIONS_TABLE,
        ProjectionExpression: "connectionId",
        FilterExpression: "#attr = :val",
        ExpressionAttributeNames: { "#attr": attribute },
        ExpressionAttributeValues: { ":val": { S: value } },
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    const ids = (response.Items ?? [])
      .map((item) => item.connectionId?.S)
      .filter(Boolean);

    await Promise.all(
      ids.map((id) => {
        if (seen.has(id)) return null;
        seen.add(id);
        return dynamodb.send(
          new DeleteItemCommand({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId: { S: id } },
          })
        );
      })
    );

    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);
}

const extractValue = (event, key) => {
  const queryValue = event.queryStringParameters?.[key];
  if (queryValue) return queryValue;
  const headers = normalizeHeaders(event.headers);
  return headers[`x-${key.toLowerCase()}`] ?? null;
};

const normalizeHeaders = (headers = {}) => {
  const normalized = {};
  Object.entries(headers).forEach(([k, v]) => {
    normalized[k.toLowerCase()] = v;
  });
  return normalized;
};

module.exports = { handler };
