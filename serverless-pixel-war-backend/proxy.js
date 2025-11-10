import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: process.env.REGION });

export const handler = async (event) => {
  console.log("Incoming request:", event);

  try {
    const body = JSON.parse(event.body);
    const { x, y, color, user } = body;

    if (x === undefined || y === undefined || !color) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing parameters" }) };
    }

    const message = {
      pixel_id: `${x}_${y}`,
      x,
      y,
      color,
      user: user || "anonymous",
      timestamp: new Date().toISOString(),
    };

    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify(message),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Pixel queued successfully", data: message }),
    };
  } catch (err) {
    console.error("Proxy error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};

