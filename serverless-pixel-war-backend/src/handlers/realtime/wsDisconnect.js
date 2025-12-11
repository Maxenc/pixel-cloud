const { DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const { ddb } = require("../../utils/aws");

const handler = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    await ddb.send(
      new DeleteItemCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: {
          connectionId: { S: connectionId },
        },
      })
    );
    return { statusCode: 200, body: "Disconnected" };
  } catch (e) {
    console.error("WS Disconnect Error:", e);
    return { statusCode: 500, body: "Failed to disconnect" };
  }
};

module.exports = { handler };

