import "dotenv/config";
import express from "express";
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  verifyKeyMiddleware,
} from "discord-interactions";
import axios from "axios";

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3001;

const API_BASE_URL = "https://og37myg23c.execute-api.eu-west-3.amazonaws.com";

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(
  "/interactions",
  verifyKeyMiddleware(process.env.PUBLIC_KEY),
  async function (req, res) {
    // Interaction type and data
    const { type, data, member, user, token, application_id } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
      const { name, options } = data;
      const userId = member ? member.user.id : user.id;

      // "pixel" command
      if (name === "pixel") {
        // Extract options
        const colorOption = options.find((opt) => opt.name === "color");
        const xOption = options.find((opt) => opt.name === "x");
        const yOption = options.find((opt) => opt.name === "y");

        if (!colorOption || !xOption || !yOption) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: "Missing parameters for pixel command.",
            },
          });
        }

        const color = colorOption.value;
        const x = xOption.value;
        const y = yOption.value;

        try {
          // Call backend to draw pixel
          await axios.post(`${API_BASE_URL}/draw`, {
            x,
            y,
            color,
            user: userId,
          });

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Pixel placed at (${x}, ${y}) with color ${color}! 🎨`,
            },
          });
        } catch (error) {
          console.error(
            "Error placing pixel:",
            error.response?.data || error.message
          );
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Failed to place pixel: ${
                error.response?.data?.error || "Unknown error"
              }`,
            },
          });
        }
      }

      // "snapshot" command
      if (name === "snapshot") {
        // 1. Send deferred response (Thinking...)
        // We construct the callback URL that the worker will use to update this message
        // URL for editing original response: PATCH /webhooks/{application_id}/{interaction_token}/messages/@original
        const callbackUrl = `https://discord.com/api/v10/webhooks/${application_id}/${token}/messages/@original`;

        try {
          // Call backend to create snapshot, passing the callback URL
          await axios.post(`${API_BASE_URL}/create_snapshot`, {
            userId: userId,
            callbackUrl: callbackUrl,
          });

          // Respond to Discord immediately that we are working on it
          return res.send({
            type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
          });
        } catch (error) {
          console.error(
            "Error creating snapshot:",
            error.response?.data || error.message
          );
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Failed to create snapshot: ${
                error.response?.data?.message || "Unknown error"
              }`,
            },
          });
        }
      }

      // Unknown command
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.EPHEMERAL,
          content: "Unknown command",
        },
      });
    }

    return res.status(400).json({ error: "unknown interaction type" });
  }
);

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
