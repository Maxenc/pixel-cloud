const { ScanCommand } = require("@aws-sdk/client-dynamodb");
const { ddb } = require("../../utils/aws");
const { success, error } = require("../../utils/common");

const handler = async (event) => {
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: process.env.SNAPSHOTS_TABLE,
        Limit: 20,
      })
    );

    const snapshots = result.Items.map((item) => ({
      id: item.snapshotId.S,
      url: item.url.S,
      createdAt: item.createdAt.S,
      triggeredBy: item.triggeredBy.S,
    }));

    snapshots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return success({ snapshots });
  } catch (e) {
    console.error(e);
    return error(500, "Internal Server Error");
  }
};

module.exports = { handler };

