import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";
import {
  handleStart, handleMessage, handlePhoto, handleVideo,
  handleLikeCallback, handleSendMessageCallback, handleReportCallback,
  handleCheckGroupCallback,
} from "./handlers.js";
import { resetAllDailyLimits, getUser } from "./db.js";
import { connectMongo } from "./mongo.js";
import { logger } from "../lib/logger.js";

export async function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.error("TELEGRAM_BOT_TOKEN is not set!");
    return;
  }

  try {
    await connectMongo();
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB");
    return;
  }

  const bot = new TelegramBot(token, { polling: true });

  logger.info("Telegram bot started with polling");

  bot.onText(/\/start(.*)/, async (msg, match) => {
    const payload = match?.[1]?.trim() || "";
    try {
      await handleStart(bot, msg, payload);
    } catch (err) {
      logger.error({ err }, "Error in /start handler");
    }
  });

  bot.on("message", async (msg) => {
    if (!msg.text && !msg.photo && !msg.video) return;
    if (msg.text?.startsWith("/start")) return;

    try {
      if (msg.photo) {
        await handlePhoto(bot, msg);
      } else if (msg.video) {
        await handleVideo(bot, msg);
      } else {
        await handleMessage(bot, msg);
      }
    } catch (err) {
      logger.error({ err }, "Error in message handler");
      try {
        await bot.sendMessage(msg.chat.id, "Terjadi kesalahan. Silakan coba lagi.");
      } catch {}
    }
  });

  bot.on("callback_query", async (query) => {
    try {
      const data = query.data || "";

      if (data.startsWith("like_")) {
        const targetId = data.replace("like_", "");
        await handleLikeCallback(bot, query, true, targetId);

      } else if (data.startsWith("dislike_")) {
        const targetId = data.replace("dislike_", "");
        await handleLikeCallback(bot, query, false, targetId);

      } else if (data.startsWith("msg_")) {
        const targetId = data.replace("msg_", "");
        await handleSendMessageCallback(bot, query, targetId);

      } else if (data.startsWith("report_")) {
        const targetId = data.replace("report_", "");
        await handleReportCallback(bot, query, targetId);

      } else if (data === "check_group") {
        await handleCheckGroupCallback(bot, query);

      } else if (data === "copy_invite") {
        const telegramId = String(query.from.id);
        const user = await getUser(telegramId);
        let botUsername = "SwipeyBot";
        try {
          const botInfo = await bot.getMe();
          botUsername = botInfo.username || "SwipeyBot";
        } catch {}
        const inviteLink = user ? `https://t.me/${botUsername}?start=ref_${user.inviteCode}` : "";
        await bot.answerCallbackQuery(query.id, {
          text: inviteLink ? `Link: ${inviteLink}` : "Link tidak ditemukan",
          show_alert: true,
        });
      }
    } catch (err) {
      logger.error({ err }, "Error in callback_query handler");
      try {
        await bot.answerCallbackQuery(query.id, { text: "Terjadi kesalahan." });
      } catch {}
    }
  });

  bot.on("polling_error", (err) => {
    logger.error({ err }, "Polling error");
  });

  cron.schedule("0 0 * * *", async () => {
    logger.info("Running daily limit reset...");
    try {
      await resetAllDailyLimits();
      logger.info("Daily limits reset successfully");
    } catch (err) {
      logger.error({ err }, "Failed to reset daily limits");
    }
  }, { timezone: "Asia/Jakarta" });

  return bot;
}
