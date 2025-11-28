const {
  DynamoDBClient,
  ScanCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");

const REGION = process.env.REGION || "eu-west-3";
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || "pixel_connections";
const dynamodb = new DynamoDBClient({ region: REGION });

const handler = async (event) => {
  const message = parseSnsEvent(event);
  if (!message) return;

  const connections = await listConnections();

  await Promise.all(
    connections.map((connection) => sendMessage(connection, message))
  );
};

function parseSnsEvent(event) {
  try {
    const record = event.Records?.[0];
    if (!record) return null;
    return JSON.parse(record.Sns?.Message ?? "{}");
  } catch (error) {
    console.error("SNS payload invalide", error);
    return null;
  }
}

async function listConnections() {
  const items = [];
  let exclusiveStartKey;

  do {
    const response = await dynamodb.send(
      new ScanCommand({
        TableName: CONNECTIONS_TABLE,
        ProjectionExpression: "connectionId, domainName, stage",
        ExclusiveStartKey: exclusiveStartKey,
      })
    );
    items.push(...(response.Items ?? []));
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items
    .map((item) => {
      const connectionId = item.connectionId?.S;
      const domainName = item.domainName?.S;
      const stage = item.stage?.S || process.env.STAGE || "dev";
      if (!connectionId || !domainName) return null;
      return { connectionId, domainName, stage };
    })
    .filter(Boolean);
}

function buildWebsocketEndpoint({ domainName, stage }) {
  return `https://${domainName}/${stage}`;
}

async function sendMessage(connection, payload) {
  const endpoint = buildWebsocketEndpoint(connection);
  const client = new ApiGatewayManagementApiClient({
    region: REGION,
    endpoint,
  });
  const connectionId = connection.connectionId;

  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(payload)),
      })
    );
  } catch (error) {
    if (
      error.name === "GoneException" ||
      error.name === "BadRequestException"
    ) {
      await cleanupConnection(connectionId);
    } else {
      console.error(`Broadcast error vers ${connectionId}`, error);
    }
  }
}

async function cleanupConnection(connectionId) {
  try {
    await dynamodb.send(
      new DeleteItemCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId: { S: connectionId } },
      })
    );
  } catch (error) {
    console.error("Cleanup connection error", error);
  }
}

module.exports = { handler };
