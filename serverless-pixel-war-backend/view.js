const {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const crypto = require("crypto");

const REGION = process.env.REGION || "eu-west-3";
const PIXEL_TABLE = process.env.PIXEL_TABLE || "pixel_canvas";
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || "pixel_connections";
const dynamodb = new DynamoDBClient({ region: REGION });

const handler = async (event) => {
  try {
    const [pixels, connectionId] = await Promise.all([
      fetchPixels(),
      registerConnection(event),
    ]);

    return success({ pixels, connectionId });
  } catch (error) {
    console.error("GET /view error", error);
    return failure("Impossible de récupérer la toile pour le moment.");
  }
};

const success = (payload) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify(payload),
});

const failure = (message) => ({
  statusCode: 500,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify({ message }),
});

async function fetchPixels() {
  const items = [];
  let exclusiveStartKey;

  do {
    const response = await dynamodb.send(
      new ScanCommand({
        TableName: PIXEL_TABLE,
        ExclusiveStartKey: exclusiveStartKey,
      })
    );
    items.push(...(response.Items ?? []));
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items.map((item) => ({
    id: item.pixel_id?.S ?? null,
    x: Number(item.x?.N ?? 0),
    y: Number(item.y?.N ?? 0),
    color: item.color?.S ?? "#000000",
    user: item.user?.S ?? "anonymous",
    timestamp: item.timestamp?.S ?? null,
  }));
}

async function registerConnection(event) {
  const existingId = extractValue(event, "connectionId");
  if (existingId) {
    const exists = await dynamodb.send(
      new GetItemCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId: { S: existingId } },
        ProjectionExpression: "connectionId",
      })
    );
    if (exists.Item) return existingId;
  }
  return crypto.randomUUID();
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
