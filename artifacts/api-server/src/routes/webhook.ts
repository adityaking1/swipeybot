import { Router } from "express";
import { getBot } from "../bot/index.js";
import { logger } from "../lib/logger.js";

const webhookRouter = Router();

const token = process.env.TELEGRAM_BOT_TOKEN || "";

webhookRouter.post(`/webhook/${token}`, (req, res) => {
  const bot = getBot();
  if (!bot) {
    logger.warn("Webhook received but bot is not initialized");
    res.sendStatus(503);
    return;
  }
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    logger.error({ err }, "Error processing webhook update");
    res.sendStatus(500);
  }
});

export default webhookRouter;
