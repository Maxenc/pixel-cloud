import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION || process.env.REGION;
const sqs = new SQSClient({ region });
const ddb = new DynamoDBClient({ region });

export const handler = async (event) => {
  console.log("Incoming request:", JSON.stringify(event));

  const routeKey =
      event?.routeKey ||
      (event?.requestContext?.http
          ? `${event.requestContext.http.method} ${event.rawPath}`
          : "");

  // ---------- /health ----------
  if (routeKey === "GET /health") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        uptime: `${process.uptime().toFixed(1)}s`,
        region,
        stage: process.env.STAGE,
        message: "Pixel War backend is healthy ✅",
      }),
    };
  }

  // ---------- /view (placeholder pour l’instant) ----------
  if (routeKey === "GET /view") {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "view endpoint alive" }),
    };
  }

  // ---------- /stats ----------
  if (routeKey === "GET /stats") {
    try {
      const data = await ddb.send(
          new ScanCommand({
            TableName: process.env.PIXEL_TABLE,
          })
      );

      const items =
          (data.Items || []).map((item) => ({
            pixel_id: item.pixel_id?.S,
            x: item.x ? Number(item.x.N) : null,
            y: item.y ? Number(item.y.N) : null,
            color: item.color?.S,
            user: item.user?.S,
            timestamp: item.timestamp?.S,
          })) || [];

      // on limite l’echantillon retourné pour éviter de tout balancer si la table grossi
      const sample = items.slice(0, 50);

      return {
        statusCode: 200,
        body: JSON.stringify({
          totalPixels: items.length,
          sampleCount: sample.length,
          pixels: sample,
        }),
      };
    } catch (err) {
      console.error("Stats error:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to fetch stats" }),
      };
    }
  }

  // ---------- /draw ----------
  try {
    if (!event?.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing body" }),
      };
    }

    const body = JSON.parse(event.body);
    const { x, y, color, user } = body;

    if (x === undefined || y === undefined || !color) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing parameters" }),
      };
    }

    const message = {
      pixel_id: `${x}_${y}`,
      x,
      y,
      color,
      user: user || "anonymous",
      timestamp: new Date().toISOString(),
    };

    await sqs.send(
        new SendMessageCommand({
          QueueUrl: process.env.QUEUE_URL,
          MessageBody: JSON.stringify(message),
        })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Pixel queued successfully",
        data: message,
      }),
    };
  } catch (err) {
    console.error("Proxy error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};
