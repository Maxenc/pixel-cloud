const { ScanCommand } = require("@aws-sdk/client-dynamodb");
const { ddb } = require("../utils/aws");
const { success, error } = require("../utils/common");

const handler = async (event) => {
  const canvasId = "main";

  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: process.env.PIXEL_TABLE,
        FilterExpression: "canvasId = :cid",
        ExpressionAttributeValues: {
          ":cid": { S: canvasId },
        },
      })
    );

    const pixels = result.Items.map((item) => ({
      x: parseInt(item.x.N),
      y: parseInt(item.y.N),
      color: item.color.S,
      user: item.userId?.S || "anonymous",
      username: item.username?.S || "anonymous",
      timestamp: item.lastUpdated?.S,
    }));

    return success({ pixels });
  } catch (e) {
    console.error("View Error:", e);
    return error(500, "Internal Server Error");
  }
};

module.exports = { handler };
