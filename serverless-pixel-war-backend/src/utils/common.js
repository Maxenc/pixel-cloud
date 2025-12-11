const { GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { ddb } = require("./aws");

const isAdmin = async (userId) => {
  if (!userId) return false;

  try {
    const result = await ddb.send(
      new GetItemCommand({
        TableName: process.env.ADMINS_TABLE,
        Key: {
          discordUserId: { S: userId },
        },
      })
    );

    return !!result.Item;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

const parseBody = (event) => {
  try {
    return JSON.parse(event.body);
  } catch (e) {
    return {};
  }
};

const success = (body, statusCode = 200) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // CORS helper
  },
  body: JSON.stringify(body),
});

const error = (statusCode, message) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
  body: JSON.stringify({ error: message }),
});

module.exports = {
  isAdmin,
  parseBody,
  success,
  error,
};
