const { ScanCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { PublishCommand } = require("@aws-sdk/client-sns");
const { ddb, s3, sns } = require("../../utils/aws");
const { generatePngBuffer } = require("../../utils/png");

const BUCKET_NAME = process.env.SNAPSHOT_IMAGE_BUCKET;
const TABLE_NAME = process.env.PIXEL_TABLE;
const SNAPSHOTS_TABLE = process.env.SNAPSHOTS_TABLE;
const BOARD_WIDTH = parseInt(process.env.BOARD_WIDTH || "256");
const BOARD_HEIGHT = parseInt(process.env.BOARD_HEIGHT || "256");

const handler = async (event) => {
  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { canvasId, triggeredBy, timestamp, callbackUrl } = body;

      console.log(`Starting snapshot generation for ${canvasId}...`);

      let items = [];
      let lastEvaluatedKey = null;

      do {
        const params = {
          TableName: TABLE_NAME,
          FilterExpression: "canvasId = :cid",
          ExpressionAttributeValues: {
            ":cid": { S: canvasId },
          },
          ExclusiveStartKey: lastEvaluatedKey,
        };
        const response = await ddb.send(new ScanCommand(params));
        items = items.concat(response.Items);
        lastEvaluatedKey = response.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      const pixelMap = new Map();
      items.forEach((item) => {
        const x = parseInt(item.x.N);
        const y = parseInt(item.y.N);
        const color = item.color.S;
        pixelMap.set(`${x},${y}`, color);
      });

      const buffer = generatePngBuffer({
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        pixels: pixelMap,
      });

      const key = `snapshots/${canvasId}-${Date.now()}.png`;
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: "image/png",
        })
      );

      const s3Url = `https://${BUCKET_NAME}.s3.${process.env.REGION}.amazonaws.com/${key}`;

      const snapshotId = `${canvasId}-${Date.now()}`;
      await ddb.send(
        new PutItemCommand({
          TableName: SNAPSHOTS_TABLE,
          Item: {
            snapshotId: { S: snapshotId },
            canvasId: { S: canvasId },
            s3Key: { S: key },
            url: { S: s3Url },
            triggeredBy: { S: triggeredBy || "system" },
            createdAt: { S: new Date().toISOString() },
          },
        })
      );

      await notifyDiscordCallback({
        callbackUrl,
        snapshotUrl: s3Url,
        snapshotId,
        triggeredBy,
      });

      await sns.send(
        new PublishCommand({
          TopicArn: process.env.SNAPSHOT_EVENTS_TOPIC_ARN,
          Message: JSON.stringify({
            type: "snapshot.ready",
            snapshotId,
            url: s3Url,
            timestamp: new Date().toISOString(),
          }),
        })
      );

      console.log(`Snapshot generated: ${s3Url}`);
    } catch (e) {
      console.error("Snapshot Worker Error:", e);
      throw e;
    }
  }
};

module.exports = { handler };

const notifyDiscordCallback = async ({
  callbackUrl,
  snapshotUrl,
  snapshotId,
  triggeredBy,
}) => {
  if (!callbackUrl) return;

  try {
    await fetch(callbackUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `📸 Snapshot générée pour <@${triggeredBy}> !`,
        embeds: [
          {
            title: "Canvas Snapshot",
            description: "Ton rendu est prêt, clique pour l'ouvrir.",
            image: { url: snapshotUrl },
            url: snapshotUrl,
            color: 0x00ff00,
            footer: {
              text: `Snapshot ID: ${snapshotId}`,
            },
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Failed to call back Discord interaction", err);
  }
};
