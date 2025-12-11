const { GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { ddb, secrets } = require("../utils/aws");
const { parseBody, success, error } = require("../utils/common");
const crypto = require("crypto");

const DISCORD_API = "https://discord.com/api";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const handler = async (event) => {
  const queryParams = event.queryStringParameters || {};
  const code = queryParams.code || parseBody(event).code;

  const redirectUri =
    queryParams.redirect_uri ||
    parseBody(event).redirectUri ||
    `https://${event.requestContext.domainName}${event.rawPath}`;

  console.log("Code:", code);
  console.log("Redirect URI:", redirectUri);

  if (!code) {
    return error(400, "Missing code");
  }

  try {
    let clientSecret;
    let clientId;

    try {
      const secretVal = await secrets.send(
        new GetSecretValueCommand({ SecretId: "discord_secret" })
      );
      const secretJson = JSON.parse(secretVal.SecretString);
      console.log("secretJson", secretJson);
      clientSecret = secretJson.client_secret;
      clientId = secretJson.client_id;
      console.log("clientSecret", clientSecret);
      console.log("clientId", clientId);
    } catch (e) {
      console.error("Failed to fetch secret", e);
      return error(500, "Configuration error");
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    console.log("params", params);

    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    console.log("tokenRes", tokenRes);

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token exchange failed", tokenData);
      return error(
        400,
        `Failed to exchange token: ${
          tokenData.error_description || tokenData.error
        }`
      );
    }

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    if (!userRes.ok) {
      return error(400, "Failed to get user info");
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;

    await ddb.send(
      new PutItemCommand({
        TableName: process.env.SESSIONS_TABLE,
        Item: {
          sessionId: { S: sessionId },
          userId: { S: userData.id },
          username: { S: userData.username },
          avatar: { S: userData.avatar || "" },
          accessToken: { S: tokenData.access_token },
          refreshToken: { S: tokenData.refresh_token || "" },
          expiresAt: { N: expiresAt.toString() },
        },
      })
    );

    const targetUrl = new URL(FRONTEND_URL);
    targetUrl.searchParams.set("sessionId", sessionId);
    targetUrl.searchParams.set("userId", userData.id);
    targetUrl.searchParams.set("username", userData.username);
    if (userData.avatar) targetUrl.searchParams.set("avatar", userData.avatar);

    return {
      statusCode: 302,
      headers: {
        Location: targetUrl.toString(),
      },
      body: "",
    };
  } catch (e) {
    console.error("Auth Handler Error:", e);
    return error(500, "Internal Server Error");
  }
};

module.exports = { handler };
