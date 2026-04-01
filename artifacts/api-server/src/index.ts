import app from "./app";
import { logger } from "./lib/logger";
import { startBot, registerWebhook } from "./bot/index.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await startBot();

    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      await registerWebhook(webhookUrl);
    } else {
      logger.warn(
        "WEBHOOK_URL is not set — webhook not registered. " +
        "Set WEBHOOK_URL to your public server URL (e.g. https://yourapp.fps.ms) to enable webhook mode."
      );
    }
  } catch (err) {
    logger.error({ err }, "Bot startup failed");
  }
});
