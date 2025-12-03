const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const REGION = process.env.AWS_REGION || process.env.REGION || "eu-west-3";
const BUCKET = process.env.SNAPSHOT_IMAGE_BUCKET;

const s3 = new S3Client({ region: REGION });

const handler = async () => {
  try {
    const snapshots = await fetchSnapshots();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ snapshots }),
    };
  } catch (error) {
    console.error("Snapshots list error", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Impossible de récupérer les snapshots",
      }),
    };
  }
};

async function fetchSnapshots() {
  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "snapshots/",
      MaxKeys: 100,
    })
  );
  return (response.Contents || [])
    .filter((object) => object.Key?.endsWith(".png"))
    .sort(
      (a, b) =>
        new Date(b.LastModified).getTime() - new Date(a.LastModified).getTime()
    )
    .map((object) => ({
      key: object.Key,
      url: buildPublicUrl(object.Key),
      size: object.Size,
      lastModified: object.LastModified
        ? new Date(object.LastModified).toISOString()
        : null,
    }));
}

function buildPublicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(
    key
  ).replace(/%2F/g, "/")}`;
}

module.exports = { handler };
