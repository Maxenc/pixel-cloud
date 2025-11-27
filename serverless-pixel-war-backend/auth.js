const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const crypto = require("crypto");

const REGION = process.env.REGION || "eu-west-3";
const DISCORD_SECRET_NAME = "discord_secret";
const SESSIONS_TABLE = process.env.SESSIONS_TABLE || "sessions";
const FRONTEND_URL = "https://3c2983b0231c.ngrok-free.app";
const DISCORD_API = "https://discord.com/api/v10";

const secretsClient = new SecretsManagerClient({ region: REGION });
const dynamodb = new DynamoDBClient({ region: REGION });

let cachedDiscordSecrets = null;

async function getDiscordCredentials() {
  if (cachedDiscordSecrets) return cachedDiscordSecrets;

  const command = new GetSecretValueCommand({
    SecretId: DISCORD_SECRET_NAME,
    VersionStage: "AWSCURRENT",
  });

  const response = await secretsClient.send(command);
  const payload = JSON.parse(response.SecretString || "{}");

  const clientId = payload.CLIENT_ID;
  const clientSecret = payload.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Discord secrets invalides (CLIENT_ID / CLIENT_SECRET manquants)"
    );
  }

  cachedDiscordSecrets = { clientId, clientSecret };
  return cachedDiscordSecrets;
}

async function exchangeCode(code, redirectUri) {
  const { clientId, clientSecret } = await getDiscordCredentials();
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectUri);

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange code: ${response.status} ${text}`);
  }

  return response.json();
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Discord user: ${response.status} ${text}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    username: data.username,
    avatar: data.avatar,
  };
}

async function createSession(user, tokens) {
  const rawId = crypto.randomUUID();
  const sessionId = `SESSION#${rawId}`;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds =
    typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;
  const expiresAt = nowSeconds + ttlSeconds;

  const item = {
    sessionId: { S: sessionId },
    discordUserId: { S: user.id },
    username: { S: user.username ?? "unknown" },
    createdAt: { N: String(nowSeconds) },
    expiresAt: { N: String(expiresAt) },
  };

  await dynamodb.send(
    new PutItemCommand({
      TableName: SESSIONS_TABLE,
      Item: item,
    })
  );

  return sessionId;
}

exports.handler = async (event) => {
  console.log("event", JSON.stringify(event));

  const method = event.requestContext?.http?.method || "GET";

  if (method === "GET") {
    try {
      const code = event.queryStringParameters?.code;
      if (!code) {
        return { statusCode: 400, body: "Missing code parameter" };
      }

      const domain = event.requestContext.domainName;
      const path = event.requestContext.http?.path || "/auth";
      const redirectUri = `https://${domain}${path}`;
      console.log("redirectUri", redirectUri);

      const tokens = await exchangeCode(code, redirectUri);
      console.log("tokens", tokens);
      const user = await fetchDiscordUser(tokens.access_token);
      console.log("user", user);
      const sessionId = await createSession(user, tokens);
      console.log("sessionId", sessionId);
      const location = `${FRONTEND_URL}?sessionId=${encodeURIComponent(
        sessionId
      )}&username=${encodeURIComponent(
        user.username ?? ""
      )}&avatar=${encodeURIComponent(
        user.avatar ?? ""
      )}&userId=${encodeURIComponent(user.id)}`;
      console.log("location", location);
      return {
        statusCode: 302,
        headers: {
          Location: location,
        },
      };
    } catch (error) {
      console.error("GET /auth error", error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "OAuth error", error: error.message }),
      };
    }
  }

  if (method === "POST") {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body || "{}")
        : event.body || {};
    console.log("POST /auth body", body);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ok: true,
      }),
    };
  }

  return {
    statusCode: 405,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ message: "Method not allowed" }),
  };
};
