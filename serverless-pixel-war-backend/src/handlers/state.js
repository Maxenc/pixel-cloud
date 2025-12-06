const { GetItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { ddb } = require("../utils/aws");
const { success, error } = require("../utils/common");

const CANVAS_ID = "main";

const handler = async () => {
  try {
    const session = await ddb.send(
      new GetItemCommand({
        TableName: process.env.GAME_SESSION_TABLE,
        Key: { canvasId: { S: CANVAS_ID } },
      })
    );

    const [activeConnections, lastSnapshotAt] = await Promise.all([
      countConnections(),
      findLatestSnapshotTimestamp(),
    ]);

    const status = session.Item?.status?.S ?? "STOPPED";
    const pixelCount = session.Item?.pixelCount?.N
      ? parseInt(session.Item.pixelCount.N, 10)
      : 0;

    return success({
      canvasId: CANVAS_ID,
      status,
      pixelCount,
      activeConnections,
      lastSnapshotAt,
    });
  } catch (err) {
    console.error("State handler error:", err);
    return error(500, "Unable to fetch state");
  }
};

const countConnections = async () => {
  const uniqueClients = new Set();
  let lastEvaluatedKey;

  do {
    const response = await ddb.send(
      new ScanCommand({
        TableName: process.env.CONNECTIONS_TABLE,
        ProjectionExpression: "clientId, connectionId",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    response.Items?.forEach((item) => {
      const id = item.clientId?.S || item.connectionId?.S;
      if (id) uniqueClients.add(id);
    });
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return uniqueClients.size;
};

const findLatestSnapshotTimestamp = async () => {
  let lastEvaluatedKey;
  let latest = null;

  do {
    const response = await ddb.send(
      new ScanCommand({
        TableName: process.env.SNAPSHOTS_TABLE,
        ProjectionExpression: "createdAt",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    response.Items?.forEach((item) => {
      const createdAt = item.createdAt?.S;
      if (!createdAt) return;
      if (!latest || new Date(createdAt) > new Date(latest)) {
        latest = createdAt;
      }
    });

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return latest;
};

module.exports = { handler };
