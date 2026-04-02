import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { startBot, registerWebhook } from "./bot/index.js";
import { setupRandomChat } from "./socket/randomChat.js";

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

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"],
});

setupRandomChat(io);

httpServer.listen(port, async (err?: Error) => {
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
        "Set WEBHOOK_URL to your public server URL to enable webhook mode."
      );
    }
  } catch (err) {
    logger.error({ err }, "Bot startup failed");
  }
});
