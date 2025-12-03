const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { generatePngBuffer } = require("./utils/png");
const crypto = require("crypto");

const REGION = process.env.AWS_REGION || process.env.REGION || "eu-west-3";
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET = process.env.SNAPSHOT_IMAGE_BUCKET;
const PIXEL_TOPIC_ARN = process.env.PIXEL_TOPIC_ARN;
const BOARD_WIDTH = Number(process.env.BOARD_WIDTH || "256");
const BOARD_HEIGHT = Number(process.env.BOARD_HEIGHT || "256");

const dynamodb = new DynamoDBClient({ region: REGION });
const s3 = new S3Client({ region: REGION });
const sns = new SNSClient({ region: REGION });

const handler = async (event) => {
  if (!event?.Records?.length) return;
  for (const record of event.Records) {
    try {
      const request = parseRequest(record);
      await processSnapshotRequest(request);
    } catch (error) {
      console.error("Snapshot worker error", error);
    }
  }
};

async function processSnapshotRequest(request) {
  if (!request || !request.requestId) {
    console.warn("Snapshot request vide, passage");
    return;
  }
  const pixels = await fetchPixels();
  const pngBuffer = await renderPng(pixels);
  const key = buildObjectKey();

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: pngBuffer,
      ContentType: "image/png",
      Metadata: {
        requested_by: request.requestedBy ?? "unknown",
        request_id: request.requestId ?? "",
      },
    })
  );

  const publicUrl = buildPublicUrl(key);

  // If a callback URL is provided (e.g. from Discord), send the result there
  if (request.callbackUrl) {
    try {
      await fetch(request.callbackUrl, {
        method: "PATCH", // We use PATCH to edit the original deferred message
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `Snapshot generée ! 📸\n${publicUrl}`,
        }),
      });
    } catch (err) {
      console.error("Failed to call back Discord webhook", err);
    }
  }

  if (PIXEL_TOPIC_ARN) {
    const message = {
      type: "snapshot_ready",
      payload: {
        key,
        url: publicUrl,
        requestedBy: request.requestedBy,
        createdAt: new Date().toISOString(),
      },
    };
    await sns.send(
      new PublishCommand({
        TopicArn: PIXEL_TOPIC_ARN,
        Message: JSON.stringify(message),
      })
    );
  }
}

async function fetchPixels() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const response = await dynamodb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey,
        ProjectionExpression: "x, y, color",
      })
    );
    items.push(...(response.Items || []));
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items.map((item) => ({
    x: Number(item.x?.N ?? 0),
    y: Number(item.y?.N ?? 0),
    color: item.color?.S ?? "#000000",
  }));
}

async function renderPng(pixels) {
  const map = new Map();
  for (const pixel of pixels) {
    if (
      Number.isInteger(pixel.x) &&
      Number.isInteger(pixel.y) &&
      pixel.x >= 0 &&
      pixel.y >= 0 &&
      pixel.x < BOARD_WIDTH &&
      pixel.y < BOARD_HEIGHT
    ) {
      map.set(`${pixel.x},${pixel.y}`, pixel.color);
    }
  }
  return generatePngBuffer({
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    pixels: map,
    background: "#000000",
  });
}

function buildObjectKey() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = crypto.randomUUID();
  return `snapshots/canvas-${timestamp}-${random}.png`;
}

function parseRequest(record) {
  try {
    return JSON.parse(record.Sns?.Message ?? "{}");
  } catch (error) {
    console.error("Invalid snapshot request payload", error);
    return {};
  }
}

function buildPublicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(
    key
  ).replace(/%2F/g, "/")}`;
}

module.exports = { handler };
