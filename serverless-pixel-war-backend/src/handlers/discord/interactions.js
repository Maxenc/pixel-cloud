const {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  verifyKey,
} = require("discord-interactions");
const { GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { secrets } = require("../../utils/aws");

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

let cachedCredentials;

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const successResponse = (data) =>
  jsonResponse(200, {
    ...data,
  });

const errorResponse = (statusCode, message) =>
  jsonResponse(statusCode, { error: message });

const normalizeHeaders = (headers = {}) => {
  const result = {};
  Object.keys(headers).forEach((key) => {
    result[key.toLowerCase()] = headers[key];
  });
  return result;
};

const getRawBody = (event) => {
  if (!event || !event.body) return "";
  if (event.isBase64Encoded) {
    return Buffer.from(event.body, "base64").toString("utf8");
  }
  return event.body;
};

const getDiscordCredentials = async () => {
  if (cachedCredentials) return cachedCredentials;
  const secretName = process.env.DISCORD_SECRET_NAME;
  if (!secretName) {
    throw new Error("DISCORD_SECRET_NAME is not configured");
  }
  const secret = await secrets.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  const payload = JSON.parse(secret.SecretString || "{}");
  const botToken =
    payload.discord_token || payload.DISCORD_TOKEN || payload.token;
  const publicKey =
    payload.public_key || payload.PUBLIC_KEY || payload.publicKey;
  const applicationId =
    payload.app_id ||
    payload.application_id ||
    payload.APP_ID ||
    payload.applicationId;

  if (!botToken || !publicKey || !applicationId) {
    throw new Error("Discord secret is missing required keys");
  }

  cachedCredentials = { botToken, publicKey, applicationId };
  return cachedCredentials;
};

const getOptionValue = (options = [], name) =>
  options.find((opt) => opt.name === name)?.value;

const formatNumber = (value) => numberFormatter.format(value ?? 0);

const formatDiscordTime = (value) => {
  if (!value) return "n/a";
  const unix = Math.floor(new Date(value).getTime() / 1000);
  return `<t:${unix}:R>`;
};

const buildEphemeralMessage = (content) => ({
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  data: {
    flags: InteractionResponseFlags.EPHEMERAL,
    content,
  },
});

const callPixelApi = async (path, init = {}) => {
  const baseUrl = process.env.PIXEL_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("PIXEL_API_BASE_URL is not configured");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await extractError(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response;
};

const extractError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.error || payload?.message || response.statusText;
  } catch {
    const text = await response.text();
    return text || response.statusText;
  }
};

const resolveUsername = (interaction) =>
  interaction.member?.nick ||
  interaction.member?.user?.global_name ||
  interaction.member?.user?.username ||
  interaction.user?.global_name ||
  interaction.user?.username ||
  interaction.user?.id;

const handlePixelCommand = async (options, userId, interaction) => {
  const color = getOptionValue(options, "color");
  const x = getOptionValue(options, "x");
  const y = getOptionValue(options, "y");

  if (color === undefined || x === undefined || y === undefined) {
    return buildEphemeralMessage("Paramètres invalides pour /pixel.");
  }

  await callPixelApi("/draw", {
    method: "POST",
    body: JSON.stringify({
      x,
      y,
      color,
      userId,
      username: resolveUsername(interaction),
    }),
  });

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `Pixel placé en (${x}, ${y}) avec la couleur ${color}. 🎨`,
    },
  };
};

const handleSnapshotCommand = async (interaction, userId, credentials) => {
  const applicationId = interaction.application_id || credentials.applicationId;
  const interactionToken = interaction.token;
  const callbackUrl =
    applicationId && interactionToken
      ? `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`
      : null;

  await callPixelApi("/admin/snapshots", {
    method: "POST",
    body: JSON.stringify({
      userId,
      callbackUrl,
      username: interaction.member?.user?.username,
    }),
  });

  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  };
};

const handleStateCommand = async () => {
  const response = await callPixelApi("/state");
  const state = await response.json();
  const color =
    state.status === "PAUSED"
      ? 0xf97316
      : state.status === "RUNNING"
      ? 0x22c55e
      : 0x64748b;

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [
        {
          title: "📊 État du canvas",
          color,
          fields: [
            { name: "Statut", value: state.status ?? "n/a", inline: true },
            {
              name: "Pixels joués",
              value: formatNumber(state.pixelCount ?? 0),
              inline: true,
            },
            {
              name: "Connexions actives",
              value: formatNumber(state.activeConnections ?? 0),
              inline: true,
            },
            {
              name: "Dernière snapshot",
              value: formatDiscordTime(state.lastSnapshotAt),
              inline: false,
            },
          ],
          footer: { text: `Canvas ${state.canvasId ?? "main"}` },
          timestamp: state.lastSnapshotAt ?? new Date().toISOString(),
        },
      ],
    },
  };
};

const handlePauseResume = async (path, userId, message) => {
  await callPixelApi(path, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: message },
  };
};

const handleApplicationCommand = async (interaction, credentials) => {
  const userId = interaction.member?.user?.id || interaction.user?.id;
  if (!userId) {
    return buildEphemeralMessage("Impossible d'identifier l'utilisateur.");
  }

  const { name, options = [] } = interaction.data || {};

  try {
    switch (name) {
      case "pixel":
        return await handlePixelCommand(options, userId, interaction);
      case "snapshot":
        return await handleSnapshotCommand(interaction, userId, credentials);
      case "state":
        return await handleStateCommand();
      case "pause":
        return await handlePauseResume(
          "/admin/session/pause",
          userId,
          `⏸️ Session mise en pause par <@${userId}>.`
        );
      case "resume":
        return await handlePauseResume(
          "/admin/session/resume",
          userId,
          `▶️ Session relancée par <@${userId}>.`
        );
      default:
        return buildEphemeralMessage("Commande inconnue.");
    }
  } catch (error) {
    console.error("Discord command error:", error);
    const message =
      error.message || "Une erreur est survenue, réessaie plus tard.";
    return buildEphemeralMessage(message);
  }
};

const handler = async (event) => {
  console.log("Incoming interaction:", event.body);
  try {
    const credentials = await getDiscordCredentials();
    const rawBody = getRawBody(event);
    const headers = normalizeHeaders(event.headers);
    const signature = headers["x-signature-ed25519"];
    const timestamp = headers["x-signature-timestamp"];

    if (!signature || !timestamp) {
      console.log("Invalid request signature");
      return errorResponse(401, "Invalid request signature");
    }

    const isValid = await verifyKey(
      rawBody,
      signature,
      timestamp,
      credentials.publicKey
    );

    if (!isValid) {
      console.log("Invalid request signature");
      return errorResponse(401, "Invalid request signature");
    }

    const interaction = JSON.parse(rawBody || "{}");

    if (interaction.type === InteractionType.PING) {
      console.log("Ping received");
      console.log(
        "repsonse",
        successResponse({ type: InteractionResponseType.PONG })
      );
      return successResponse({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const response = await handleApplicationCommand(interaction, credentials);
      return successResponse(response);
    }

    return errorResponse(400, "Unsupported interaction type");
  } catch (error) {
    console.error("Discord interaction failure:", error);
    return errorResponse(500, "Internal Server Error");
  }
};

module.exports = { handler };
