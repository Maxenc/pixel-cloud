const handler = async (event) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn("No Discord Webhook URL configured.");
    return;
  }

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.Sns.Message);
      if (msg.type === "snapshot.ready") {
        const { url, snapshotId, timestamp } = msg;

        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `📸 **New Snapshot Generated!**\nID: ${snapshotId}\nTime: ${timestamp}`,
            embeds: [
              {
                image: { url: url },
                title: "Canvas Snapshot",
                color: 0x00ff00,
              },
            ],
          }),
        });
      }
    } catch (e) {
      console.error("Discord Webhook Error:", e);
    }
  }
};

module.exports = { handler };

