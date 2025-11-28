const {
  DynamoDBClient,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");

const REGION = process.env.REGION || "eu-west-3";
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || "pixel_connections";

const dynamodb = new DynamoDBClient({ region: REGION });

const handler = async (event) => {
  const connectionId = event.requestContext?.connectionId;
  if (!connectionId) return { statusCode: 400, body: "Missing connectionId" };

  try {
    await dynamodb.send(
      new DeleteItemCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId: { S: connectionId } },
      })
    );
    return { statusCode: 200, body: "disconnected" };
  } catch (error) {
    console.error("wsDisconnect error", error);
    return { statusCode: 500, body: "Failed to disconnect" };
  }
};

module.exports = { handler };
