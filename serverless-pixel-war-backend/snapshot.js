import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ddb = new DynamoDBClient({ region: process.env.REGION });
const s3 = new S3Client({ region: process.env.REGION });

export const handler = async () => {
  console.log("Generating snapshot...");

  try {
    const pixels = await ddb.send(new ScanCommand({
      TableName: process.env.TABLE_NAME,
    }));

    const canvasData = pixels.Items.map(item => ({
      x: Number(item.x.N),
      y: Number(item.y.N),
      color: item.color.S,
      user: item.user.S,
    }));

    const snapshot = {
      generatedAt: new Date().toISOString(),
      totalPixels: canvasData.length,
      pixels: canvasData,
    };

    const objectKey = `snapshot-${Date.now()}.json`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: objectKey,
      Body: JSON.stringify(snapshot, null, 2),
      ContentType: "application/json",
    }));

    console.log(`✅ Snapshot saved to S3 as ${objectKey}`);

    return { statusCode: 200, body: JSON.stringify({ message: "Snapshot generated", key: objectKey }) };
  } catch (err) {
    console.error("❌ Snapshot generation failed:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Snapshot failed" }) };
  }
};

