const {
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { ddb } = require("../../utils/aws");

const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const params = event.queryStringParameters || {};
  const clientId = params.clientId || connectionId;
  const sessionId = params.sessionId;

  try {
    if (clientId) {
      try {
        const existing = await ddb.send(
          new QueryCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            IndexName: "clientIdIndex",
            KeyConditionExpression: "clientId = :cid",
            ExpressionAttributeValues: {
              ":cid": { S: clientId },
            },
            ProjectionExpression: "connectionId",
          })
        );

        const staleConnections = existing.Items || [];
        await Promise.all(
          staleConnections
            .filter((item) => item.connectionId?.S !== connectionId)
            .map((item) =>
              ddb.send(
                new DeleteItemCommand({
                  TableName: process.env.CONNECTIONS_TABLE,
                  Key: { connectionId: { S: item.connectionId.S } },
                })
              )
            )
        );
      } catch (queryError) {
        if (queryError.name !== "ResourceNotFoundException") {
          throw queryError;
        }
        console.warn(
          "clientIdIndex missing, skipping duplicate cleanup.",
          queryError
        );
      }
    }

    await ddb.send(
      new PutItemCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: {
          connectionId: { S: connectionId },
          clientId: { S: clientId },
          ...(sessionId ? { sessionId: { S: sessionId } } : {}),
          connectedAt: { S: new Date().toISOString() },
        },
      })
    );
    return { statusCode: 200, body: "Connected" };
  } catch (e) {
    console.error("WS Connect Error:", e);
    return { statusCode: 500, body: "Failed to connect" };
  }
};

module.exports = { handler };
