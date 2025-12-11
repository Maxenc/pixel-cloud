const { ScanCommand, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { ddb, getApiGatewayClient } = require("../../utils/aws");

const handler = async (event) => {
  const messages = event.Records.map((record) => {
    try {
      return JSON.parse(record.Sns.Message);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  if (messages.length === 0) return;

  let connections = [];
  let lastEvaluatedKey = null;
  
  do {
    const result = await ddb.send(
      new ScanCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        ProjectionExpression: "connectionId",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );
    connections = connections.concat(result.Items);
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  if (connections.length === 0) return;
  
  const apigw = getApiGatewayClient(process.env.WEBSOCKET_API_ENDPOINT);

  const sendPromises = connections.map(async (conn) => {
    const connectionId = conn.connectionId.S;
    try {
      for (const msg of messages) {
        await apigw.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: JSON.stringify(msg),
          })
        );
      }
    } catch (e) {
      if (e.statusCode === 410) {
        await ddb.send(
          new DeleteItemCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: { S: connectionId } },
          })
        );
      } else {
        console.error(`Failed to send to ${connectionId}:`, e);
      }
    }
  });

  await Promise.all(sendPromises);
};

module.exports = { handler };

