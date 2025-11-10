import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({ region: process.env.REGION });

export const handler = async (event) => {
  console.log("Processing batch of messages:", event.Records.length);

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      console.log("Processing pixel:", body);

      await ddb.send(new PutItemCommand({
        TableName: process.env.PIXEL_TABLE,
        Item: {
          pixel_id: { S: body.pixel_id },
          x: { N: String(body.x) },
          y: { N: String(body.y) },
          color: { S: body.color },
          user: { S: body.user },
          timestamp: { S: body.timestamp },
        },
      }));

      console.log(`✅ Pixel ${body.pixel_id} stored in DynamoDB`);
    } catch (err) {
      console.error("❌ Error processing message:", err);
    }
  }

  return { statusCode: 200 };
};

