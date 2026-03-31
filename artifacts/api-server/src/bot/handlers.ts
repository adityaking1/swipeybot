import TelegramBot from "node-telegram-bot-api";
import { logger } from "../lib/logger.js";
import {
  getUser, createUser, updateUser, getNextCandidate,
  recordLike, checkMutualLike, createMatch, checkAndResetDailyLimit,
  incrementDailyUsed, addInviteLimit, getUserByInviteCode, hasAlreadyLiked,
  saveMessage, claimGroupBonus,
} from "./db.js";
import {
  getState, setState, getTempData, setTempData, clearTempData,
} from "./states.js";
import {
  mainMenuKeyboard, genderKeyboard, interestKeyboard,
  editProfileKeyboard, browsingKeyboard, shareInviteKeyboard, cancelKeyboard,
  groupKeyboard,
} from "./keyboards.js";

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || "";

export function formatProfile(user: {
  name: string;
  gender: string;
  interest: string;
  age: number;
  bio?: string | null;
  location?: string | null;
}): string {
  const genderLabel = user.gender === "pria" ? "🙋‍♂️ Pria" : "🙋‍♀️ Wanita";
  const interestLabel = user.interest === "pria" ? "👨 Pria" : "👩 Wanita";
  return (
    `👤 *${user.name}*\n` +
    `🎂 Usia: ${user.age} tahun\n` +
    `${genderLabel}\n` +
    `❤️ Tertarik pada: ${interestLabel}\n` +
    (user.location ? `📍 Lokasi: ${user.location}\n` : "") +
    (user.bio ? `📝 Bio: ${user.bio}` : "")
  );
}

export async function handleStart(bot: TelegramBot, msg: TelegramBot.Message, payload?: string) {
  const telegramId = String(msg.from!.id);

  const user = await getUser(telegramId);

  if (payload && payload.startsWith("ref_")) {
    const inviteCode = payload.replace("ref_", "");
    if (!user) {
      setTempData(telegramId, { inviteCode });
    }
  }

  if (user) {
    await bot.sendMessage(msg.chat.id,
      `Selamat datang kembali, *${user.name}*! 👋\n\nGunakan menu di bawah untuk mulai.`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
    );
    setState(telegramId, "idle");
  } else {
    await bot.sendMessage(msg.chat.id,
      `Halo! Selamat datang di *SwipeyBot* 💕\n\nAyo cari kenalan baru! Pertama, mari buat profilmu dulu.\n\nSiapa *namamu*?`,
      { parse_mode: "Markdown", reply_markup: { remove_keyboard: true } }
    );
    setState(telegramId, "await_name");
  }
}

export async function handleMyProfile(bot: TelegramBot, msg: TelegramBot.Message) {
  const telegramId = String(msg.from!.id);
  const user = await getUser(telegramId);

  if (!user) {
    await bot.sendMessage(msg.chat.id, "Kamu belum punya profil. Kirim /start untuk membuat profil.");
    return;
  }

  await checkAndResetDailyLimit(telegramId);
  const caption = formatProfile(user);

  if (user.photoFileId) {
    if (user.mediaType === "video") {
      await bot.sendVideo(msg.chat.id, user.photoFileId, {
        caption,
        parse_mode: "Markdown",
      });
    } else {
      await bot.sendPhoto(msg.chat.id, user.photoFileId, {
        caption,
        parse_mode: "Markdown",
      });
    }
  } else {
    await bot.sendMessage(msg.chat.id, caption, { parse_mode: "Markdown" });
  }
}

export async function handleEditProfile(bot: TelegramBot, msg: TelegramBot.Message) {
  const telegramId = String(msg.from!.id);
  const user = await getUser(telegramId);

  if (!user) {
    await bot.sendMessage(msg.chat.id, "Kamu belum punya profil. Kirim /start untuk membuat profil.");
    return;
  }

  setState(telegramId, "await_edit_choice");
  await bot.sendMessage(msg.chat.id, "✏️ *Ubah Profil*\n\nPilih apa yang ingin kamu ubah:",
    { parse_mode: "Markdown", reply_markup: editProfileKeyboard }
  );
}

export async function handleBrowse(bot: TelegramBot, msg: TelegramBot.Message) {
  const telegramId = String(msg.from!.id);
  const user = await checkAndResetDailyLimit(telegramId);

  if (!user) {
    await bot.sendMessage(msg.chat.id, "Kamu belum punya profil. Kirim /start untuk membuat profil.");
    return;
  }

  if (user.dailyUsed >= user.dailyLimit) {
    await bot.sendMessage(msg.chat.id,
      `⛔ *Limit Harian Habis!*\n\nKamu sudah melihat ${user.dailyLimit} profil hari ini.\n\nLimit akan direset besok pagi 🌅\n\n💡 *Tips:* Undang lebih banyak teman untuk mendapatkan limit lebih banyak! Setiap teman yang bergabung = +10 limit/hari`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
    );
    return;
  }

  setState(telegramId, "browsing");
  await sendNextCandidate(bot, msg.chat.id, telegramId, user.interest);
}

export async function sendNextCandidate(
  bot: TelegramBot,
  chatId: number,
  viewerTelegramId: string,
  interest: "pria" | "wanita"
) {
  const user = await checkAndResetDailyLimit(viewerTelegramId);
  if (!user) return;

  if (user.dailyUsed >= user.dailyLimit) {
    await bot.sendMessage(chatId,
      `⛔ *Limit Harian Habis!*\n\nKamu sudah melihat ${user.dailyLimit} profil hari ini.\n\nLimit akan direset besok pagi 🌅\n\n💡 Undang teman untuk mendapat lebih banyak limit!`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
    );
    setState(viewerTelegramId, "idle");
    return;
  }

  const candidate = await getNextCandidate(viewerTelegramId, interest);

  if (!candidate) {
    await bot.sendMessage(chatId,
      `😔 *Tidak ada lagi kenalan yang tersedia saat ini.*\n\nCoba lagi nanti atau undang temanmu agar komunitas makin ramai!`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
    );
    setState(viewerTelegramId, "idle");
    return;
  }

  const sisa = user.dailyLimit - user.dailyUsed;
  const caption = formatProfile(candidate) + `\n\n📊 Sisa limit hari ini: *${sisa}* profil`;

  await incrementDailyUsed(viewerTelegramId);

  if (candidate.photoFileId) {
    if (candidate.mediaType === "video") {
      await bot.sendVideo(chatId, candidate.photoFileId, {
        caption,
        parse_mode: "Markdown",
        reply_markup: browsingKeyboard(candidate.telegramId),
      });
    } else {
      await bot.sendPhoto(chatId, candidate.photoFileId, {
        caption,
        parse_mode: "Markdown",
        reply_markup: browsingKeyboard(candidate.telegramId),
      });
    }
  } else {
    await bot.sendMessage(chatId, caption, {
      parse_mode: "Markdown",
      reply_markup: browsingKeyboard(candidate.telegramId),
    });
  }
}

export async function handleLikeCallback(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  isLike: boolean,
  targetId: string
) {
  const telegramId = String(query.from.id);
  const chatId = query.message!.chat.id;

  await bot.answerCallbackQuery(query.id);

  const alreadyActed = await hasAlreadyLiked(telegramId, targetId);
  if (alreadyActed) {
    await bot.sendMessage(chatId, "Kamu sudah merespons profil ini sebelumnya.");
    return;
  }

  await recordLike(telegramId, targetId, isLike);

  if (isLike) {
    const isMutual = await checkMutualLike(telegramId, targetId);
    if (isMutual) {
      await createMatch(telegramId, targetId);

      const viewer = await getUser(telegramId);
      const target = await getUser(targetId);

      const viewerLink = viewer?.username
        ? `[${viewer.name}](https://t.me/${viewer.username})`
        : `[${viewer?.name || "Pengguna"}](tg://user?id=${telegramId})`;

      const targetLink = target?.username
        ? `[${target.name}](https://t.me/${target.username})`
        : `[${target?.name || "Pengguna"}](tg://user?id=${targetId})`;

      await bot.sendMessage(chatId,
        `🎉 *MATCH!* 💕\n\nKamu dan ${targetLink} saling suka!\n\nLangsung hubungi dia sekarang!`,
        { parse_mode: "Markdown" }
      );

      try {
        await bot.sendMessage(Number(targetId),
          `🎉 *MATCH!* 💕\n\nKamu dan ${viewerLink} saling suka!\n\nLangsung hubungi dia sekarang!`,
          { parse_mode: "Markdown" }
        );
      } catch {
      }

      const user = await getUser(telegramId);
      if (user) {
        await sendNextCandidate(bot, chatId, telegramId, user.interest as "pria" | "wanita");
      }
      return;
    } else {
      await bot.sendMessage(chatId, "❤️ Kamu menyukai profil ini! Nantikan jika mereka membalasnya~");
    }
  } else {
    await bot.sendMessage(chatId, "👎 Dilewati.");
  }

  const user = await getUser(telegramId);
  if (user) {
    await sendNextCandidate(bot, chatId, telegramId, user.interest as "pria" | "wanita");
  }
}

export async function handleSendMessageCallback(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  targetId: string
) {
  const telegramId = String(query.from.id);
  const chatId = query.message!.chat.id;

  await bot.answerCallbackQuery(query.id);

  const target = await getUser(targetId);
  if (!target) {
    await bot.sendMessage(chatId, "Pengguna tidak ditemukan.");
    return;
  }

  setTempData(telegramId, { messageTo: targetId, messageToName: target.name });
  setState(telegramId, "await_send_message");

  await bot.sendMessage(chatId,
    `💌 Kirim pesan ke *${target.name}*\n\nTulis pesanmu (maks. 500 karakter):`,
    { parse_mode: "Markdown", reply_markup: cancelKeyboard }
  );
}

export async function handleReportCallback(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  targetId: string
) {
  const telegramId = String(query.from.id);
  const chatId = query.message!.chat.id;

  await bot.answerCallbackQuery(query.id);

  const target = await getUser(targetId);
  if (!target) {
    await bot.sendMessage(chatId, "Pengguna tidak ditemukan.");
    return;
  }

  setTempData(telegramId, { reportTarget: targetId, reportTargetName: target.name });
  setState(telegramId, "await_report_reason");

  await bot.sendMessage(chatId,
    `🚨 *Laporkan Pengguna*\n\nKamu akan melaporkan *${target.name}*.\n\nTuliskan alasan laporanmu:`,
    { parse_mode: "Markdown", reply_markup: cancelKeyboard }
  );
}

export async function handleInvite(bot: TelegramBot, msg: TelegramBot.Message) {
  const telegramId = String(msg.from!.id);
  const user = await getUser(telegramId);

  if (!user) {
    await bot.sendMessage(msg.chat.id, "Kamu belum punya profil. Kirim /start untuk membuat profil.");
    return;
  }

  let botUsername = "SwipeyBot";
  try {
    const botInfo = await bot.getMe();
    botUsername = botInfo.username || "SwipeyBot";
  } catch {
  }

  const inviteLink = `https://t.me/${botUsername}?start=ref_${user.inviteCode}`;

  await bot.sendMessage(msg.chat.id,
    `📨 *Undang Teman & Dapat Lebih Banyak Limit!*\n\n` +
    `🔗 Link undanganmu:\n\`${inviteLink}\`\n\n` +
    `📊 *Statistik Undanganmu:*\n` +
    `👥 Total diundang: *${user.inviteCount}* teman\n` +
    `📋 Limit harian saat ini: *${user.dailyLimit}* profil/hari\n\n` +
    `💡 Setiap teman yang bergabung = *+10 limit/hari!*\n\n` +
    `Bagikan ke teman-temanmu melalui:`,
    {
      parse_mode: "Markdown",
      reply_markup: shareInviteKeyboard(inviteLink, botUsername),
    }
  );
}

export async function handleJoinGroup(bot: TelegramBot, msg: TelegramBot.Message) {
  const telegramId = String(msg.from!.id);
  const user = await getUser(telegramId);

  if (!user) {
    await bot.sendMessage(msg.chat.id, "Kamu belum punya profil. Kirim /start untuk membuat profil.");
    return;
  }

  const groupLink = process.env.TELEGRAM_GROUP_LINK || "";

  if (!groupLink) {
    await bot.sendMessage(msg.chat.id, "Fitur group belum dikonfigurasi. Hubungi admin.");
    return;
  }

  if (user.groupBonusClaimed) {
    await bot.sendMessage(msg.chat.id,
      `✅ *Kamu sudah mendapatkan bonus group!*\n\n` +
      `🎁 +10 limit sudah ditambahkan ke akunmu sebelumnya.\n` +
      `📋 Limit harian saat ini: *${user.dailyLimit}* profil/hari`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
    );
    return;
  }

  await bot.sendMessage(msg.chat.id,
    `🏠 *Gabung Group SwipeyBot!*\n\n` +
    `Dapatkan *+10 limit harian* gratis dengan bergabung ke group komunitas kami!\n\n` +
    `📋 Caranya:\n` +
    `1️⃣ Klik tombol *Buka Group* di bawah\n` +
    `2️⃣ Bergabung ke group\n` +
    `3️⃣ Kembali ke sini & klik *Saya Sudah Gabung*\n\n` +
    `🎁 Bonus: *+10 limit/hari* langsung aktif!`,
    { parse_mode: "Markdown", reply_markup: groupKeyboard(groupLink) }
  );
}

export async function handleCheckGroupCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery) {
  const telegramId = String(query.from.id);
  const chatId = query.message!.chat.id;

  await bot.answerCallbackQuery(query.id);

  const user = await getUser(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "Profil tidak ditemukan. Kirim /start untuk membuat profil.");
    return;
  }

  if (user.groupBonusClaimed) {
    await bot.sendMessage(chatId,
      `✅ Kamu sudah pernah klaim bonus group sebelumnya.\n\nLimit harian kamu: *${user.dailyLimit}* profil/hari`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
    );
    return;
  }

  const rawGroupId = process.env.TELEGRAM_GROUP_ID || "";
  if (!rawGroupId) {
    await bot.sendMessage(chatId, "Konfigurasi group belum lengkap. Hubungi admin.");
    return;
  }
  const groupId = rawGroupId.startsWith("-") || rawGroupId.startsWith("@")
    ? rawGroupId
    : `@${rawGroupId}`;

  try {
    const member = await bot.getChatMember(groupId, query.from.id);
    const validStatuses = ["member", "administrator", "creator"];
    const notMemberStatuses = ["left", "kicked"];

    if (validStatuses.includes(member.status)) {
      await claimGroupBonus(telegramId);
      await bot.sendMessage(chatId,
        `🎉 *Berhasil! Bonus group aktif!*\n\n` +
        `✅ Keanggotaan grupmu terverifikasi.\n` +
        `🎁 *+10 limit harian* sudah ditambahkan!\n` +
        `📋 Limit harian kamu sekarang: *${user.dailyLimit + 10}* profil/hari`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
    } else if (notMemberStatuses.includes(member.status)) {
      const groupLink = process.env.TELEGRAM_GROUP_LINK || "";
      await bot.sendMessage(chatId,
        `❌ *Kamu belum bergabung ke group.*\n\nSilakan join dulu, lalu kembali dan klik tombol cek lagi.`,
        { parse_mode: "Markdown", reply_markup: groupLink ? groupKeyboard(groupLink) : undefined }
      );
    } else {
      await claimGroupBonus(telegramId);
      await bot.sendMessage(chatId,
        `🎉 *Berhasil! Bonus group aktif!*\n\n` +
        `🎁 *+10 limit harian* sudah ditambahkan!\n` +
        `📋 Limit harian kamu sekarang: *${user.dailyLimit + 10}* profil/hari`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
    }
  } catch (err: any) {
    const errMsg: string = err?.message || "";
    logger.error({ err, groupId, userId: query.from.id }, "getChatMember failed");

    if (errMsg.includes("member list is inaccessible") || errMsg.includes("not enough rights")) {
      await bot.sendMessage(chatId,
        `⚠️ *Bot belum jadi admin di group.*\n\nMinta admin group jadikan bot sebagai admin, lalu coba lagi.`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
    } else if (errMsg.includes("chat not found") || errMsg.includes("PEER_ID_INVALID")) {
      await bot.sendMessage(chatId,
        `⚠️ *Group tidak ditemukan.*\n\nKonfigurasi Group ID salah. Hubungi admin bot.`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
    } else if (errMsg.includes("user not found") || errMsg.includes("participant_id_invalid")) {
      const groupLink = process.env.TELEGRAM_GROUP_LINK || "";
      await bot.sendMessage(chatId,
        `❌ *Kamu belum bergabung ke group.*\n\nSilakan join dulu, lalu klik tombol cek lagi.`,
        { parse_mode: "Markdown", reply_markup: groupLink ? groupKeyboard(groupLink) : undefined }
      );
    } else {
      logger.error({ errMsg }, "Unhandled getChatMember error, granting bonus anyway");
      await claimGroupBonus(telegramId);
      await bot.sendMessage(chatId,
        `🎉 *Terima kasih sudah bergabung!*\n\n` +
        `🎁 *+10 limit harian* sudah ditambahkan!\n` +
        `📋 Limit harian kamu sekarang: *${user.dailyLimit + 10}* profil/hari`,
        { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
      );
    }
  }
}

export async function handleMessage(bot: TelegramBot, msg: TelegramBot.Message) {
  if (!msg.from || (!msg.text && !msg.photo && !msg.video)) return;

  const telegramId = String(msg.from.id);
  const text = msg.text || "";
  const state = getState(telegramId);

  if (msg.text === "🔙 Kembali" || msg.text === "🔙 Menu Utama" || msg.text === "❌ Batal") {
    setState(telegramId, "idle");
    clearTempData(telegramId);
    await bot.sendMessage(msg.chat.id, "Dibatalkan. Menu utama:", { reply_markup: mainMenuKeyboard });
    return;
  }

  if (msg.text === "👤 Profil Saya") {
    await handleMyProfile(bot, msg);
    return;
  }

  if (msg.text === "✏️ Ubah Profil") {
    await handleEditProfile(bot, msg);
    return;
  }

  if (msg.text === "🚀 Cari Kenalan") {
    await handleBrowse(bot, msg);
    return;
  }

  if (msg.text === "📨 Undang Teman") {
    await handleInvite(bot, msg);
    return;
  }

  if (msg.text === "🏠 Gabung Group") {
    await handleJoinGroup(bot, msg);
    return;
  }

  switch (state) {
    case "await_name": {
      if (!text || text.length < 2) {
        await bot.sendMessage(msg.chat.id, "Nama terlalu pendek. Masukkan nama yang valid.");
        return;
      }
      setTempData(telegramId, { name: text });
      setState(telegramId, "await_gender");
      await bot.sendMessage(msg.chat.id, "Kamu *pria* atau *wanita*?",
        { parse_mode: "Markdown", reply_markup: genderKeyboard }
      );
      break;
    }

    case "await_gender": {
      let gender: "pria" | "wanita" | null = null;
      if (text.includes("Pria") || text.toLowerCase() === "pria") gender = "pria";
      if (text.includes("Wanita") || text.toLowerCase() === "wanita") gender = "wanita";
      if (!gender) {
        await bot.sendMessage(msg.chat.id, "Pilih salah satu:", { reply_markup: genderKeyboard });
        return;
      }
      setTempData(telegramId, { gender });
      setState(telegramId, "await_interest");
      await bot.sendMessage(msg.chat.id, "Kamu tertarik pada siapa?",
        { parse_mode: "Markdown", reply_markup: interestKeyboard }
      );
      break;
    }

    case "await_interest": {
      let interest: "pria" | "wanita" | null = null;
      if (text.includes("Pria") || text.toLowerCase().includes("pria")) interest = "pria";
      if (text.includes("Wanita") || text.toLowerCase().includes("wanita")) interest = "wanita";
      if (!interest) {
        await bot.sendMessage(msg.chat.id, "Pilih salah satu:", { reply_markup: interestKeyboard });
        return;
      }
      setTempData(telegramId, { interest });
      setState(telegramId, "await_age");
      await bot.sendMessage(msg.chat.id, "Berapa *usiamu*? (contoh: 22)",
        { parse_mode: "Markdown", reply_markup: { remove_keyboard: true } }
      );
      break;
    }

    case "await_age": {
      const age = parseInt(text);
      if (isNaN(age) || age < 17 || age > 99) {
        await bot.sendMessage(msg.chat.id, "Masukkan usia yang valid (17-99).");
        return;
      }
      setTempData(telegramId, { age: String(age) });
      setState(telegramId, "await_bio");
      await bot.sendMessage(msg.chat.id, "Ceritakan sedikit tentang dirimu! ✍️\n\n(Opsional — tulis bio singkatmu)");
      break;
    }

    case "await_bio": {
      const bio = text === "/skip" ? "" : text;
      setTempData(telegramId, { bio });
      setState(telegramId, "await_location");
      await bot.sendMessage(msg.chat.id,
        `📍 *Lokasi kamu di mana?*\n\nTulis nama kota atau daerahmu (contoh: Jakarta, Bandung, Surabaya)`,
        { parse_mode: "Markdown", reply_markup: { remove_keyboard: true } }
      );
      break;
    }

    case "await_location": {
      const location = text === "/skip" ? "" : text;
      if (location && location.length > 50) {
        await bot.sendMessage(msg.chat.id, "Nama lokasi terlalu panjang (maks. 50 karakter).");
        return;
      }
      setTempData(telegramId, { location });
      setState(telegramId, "await_photo");
      await bot.sendMessage(msg.chat.id,
        `📸 *Foto Profil Wajib!*\n\nKirimkan *foto* atau *video* profilmu.\n\nFoto profil diperlukan agar kenalan dapat melihat penampilanmu 😊`,
        { parse_mode: "Markdown", reply_markup: { remove_keyboard: true } }
      );
      break;
    }

    case "await_photo": {
      await bot.sendMessage(msg.chat.id,
        `📸 Silakan kirimkan *foto* atau *video* profilmu ya!\n\nFoto profil wajib diisi.`,
        { parse_mode: "Markdown" }
      );
      break;
    }

    case "await_edit_choice": {
      if (text === "✏️ Nama") {
        setState(telegramId, "await_edit_name");
        await bot.sendMessage(msg.chat.id, "Masukkan nama baru:", { reply_markup: { remove_keyboard: true } });
      } else if (text === "🎂 Usia") {
        setState(telegramId, "await_edit_age");
        await bot.sendMessage(msg.chat.id, "Masukkan usia baru:", { reply_markup: { remove_keyboard: true } });
      } else if (text === "📝 Bio") {
        setState(telegramId, "await_edit_bio");
        await bot.sendMessage(msg.chat.id, "Masukkan bio baru:", { reply_markup: { remove_keyboard: true } });
      } else if (text === "📍 Lokasi") {
        setState(telegramId, "await_edit_location");
        await bot.sendMessage(msg.chat.id, "Masukkan lokasi baru (nama kota/daerah):", { reply_markup: { remove_keyboard: true } });
      } else if (text === "📸 Foto/Video") {
        setState(telegramId, "await_edit_photo");
        await bot.sendMessage(msg.chat.id, "Kirimkan foto atau video baru:", { reply_markup: { remove_keyboard: true } });
      }
      break;
    }

    case "await_edit_name": {
      if (!text || text.length < 2) {
        await bot.sendMessage(msg.chat.id, "Nama terlalu pendek.");
        return;
      }
      await updateUser(telegramId, { name: text });
      setState(telegramId, "idle");
      await bot.sendMessage(msg.chat.id, "✅ Nama berhasil diubah!", { reply_markup: mainMenuKeyboard });
      break;
    }

    case "await_edit_age": {
      const age = parseInt(text);
      if (isNaN(age) || age < 17 || age > 99) {
        await bot.sendMessage(msg.chat.id, "Masukkan usia yang valid (17-99).");
        return;
      }
      await updateUser(telegramId, { age });
      setState(telegramId, "idle");
      await bot.sendMessage(msg.chat.id, "✅ Usia berhasil diubah!", { reply_markup: mainMenuKeyboard });
      break;
    }

    case "await_edit_bio": {
      await updateUser(telegramId, { bio: text });
      setState(telegramId, "idle");
      await bot.sendMessage(msg.chat.id, "✅ Bio berhasil diubah!", { reply_markup: mainMenuKeyboard });
      break;
    }

    case "await_edit_location": {
      if (!text || text.length < 2) {
        await bot.sendMessage(msg.chat.id, "Nama lokasi terlalu pendek. Masukkan nama kota/daerahmu.");
        return;
      }
      if (text.length > 50) {
        await bot.sendMessage(msg.chat.id, "Nama lokasi terlalu panjang (maks. 50 karakter).");
        return;
      }
      await updateUser(telegramId, { location: text });
      setState(telegramId, "idle");
      await bot.sendMessage(msg.chat.id, "✅ Lokasi berhasil diubah!", { reply_markup: mainMenuKeyboard });
      break;
    }

    case "await_send_message": {
      const temp = getTempData(telegramId);
      const targetId = temp.messageTo;
      const targetName = temp.messageToName;

      if (!targetId) {
        setState(telegramId, "idle");
        await bot.sendMessage(msg.chat.id, "Terjadi kesalahan. Kembali ke menu.", { reply_markup: mainMenuKeyboard });
        return;
      }

      if (!text || text.length < 1) {
        await bot.sendMessage(msg.chat.id, "Pesan tidak boleh kosong.");
        return;
      }

      if (text.length > 500) {
        await bot.sendMessage(msg.chat.id, "Pesan terlalu panjang (maks. 500 karakter).");
        return;
      }

      const sender = await getUser(telegramId);

      await saveMessage(telegramId, targetId, text);

      try {
        await bot.sendMessage(Number(targetId),
          `💌 *Pesan Masuk!*\n\nKamu mendapat pesan dari *${sender?.name || "Seseorang"}*:\n\n"${text}"\n\n_Balas pesan ini dengan melihat profilnya di menu Cari Kenalan._`,
          { parse_mode: "Markdown" }
        );
        await bot.sendMessage(msg.chat.id,
          `✅ Pesanmu berhasil dikirim ke *${targetName}*!`,
          { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
        );
      } catch {
        await bot.sendMessage(msg.chat.id,
          `✅ Pesan terkirim! (Pengguna akan melihatnya nanti)`,
          { reply_markup: mainMenuKeyboard }
        );
      }

      clearTempData(telegramId);
      setState(telegramId, "idle");
      break;
    }

    case "await_report_reason": {
      const temp = getTempData(telegramId);
      const targetId = temp.reportTarget;
      const targetName = temp.reportTargetName;

      if (!targetId) {
        setState(telegramId, "idle");
        await bot.sendMessage(msg.chat.id, "Terjadi kesalahan. Kembali ke menu.", { reply_markup: mainMenuKeyboard });
        return;
      }

      if (!text || text.length < 5) {
        await bot.sendMessage(msg.chat.id, "Alasan laporan terlalu singkat. Jelaskan lebih detail.");
        return;
      }

      const reporter = await getUser(telegramId);
      const target = await getUser(targetId);

      if (ADMIN_ID) {
        try {
          await bot.sendMessage(Number(ADMIN_ID),
            `🚨 *LAPORAN PENGGUNA*\n\n` +
            `👤 *Pelapor:* ${reporter?.name || "?"} (ID: \`${telegramId}\`${reporter?.username ? `, @${reporter.username}` : ""})\n` +
            `🎯 *Dilaporkan:* ${target?.name || "?"} (ID: \`${targetId}\`${target?.username ? `, @${target.username}` : ""})\n\n` +
            `📝 *Alasan:*\n${text}`,
            { parse_mode: "Markdown" }
          );
        } catch {
        }
      }

      await bot.sendMessage(msg.chat.id,
        `✅ Laporan kamu telah dikirim ke admin.\n\nTerima kasih telah menjaga keamanan komunitas! 🛡️`,
        { reply_markup: mainMenuKeyboard }
      );

      clearTempData(telegramId);
      setState(telegramId, "idle");
      break;
    }

    default:
      if (state === "idle") {
        await bot.sendMessage(msg.chat.id, "Gunakan menu di bawah:", { reply_markup: mainMenuKeyboard });
      }
  }
}

export async function handlePhoto(bot: TelegramBot, msg: TelegramBot.Message) {
  if (!msg.from) return;
  const telegramId = String(msg.from.id);
  const state = getState(telegramId);

  if (state === "await_photo") {
    const photo = msg.photo![msg.photo!.length - 1];
    setTempData(telegramId, { photoFileId: photo.file_id, mediaType: "photo" });
    await finishRegistration(bot, msg, telegramId);
  } else if (state === "await_edit_photo") {
    const photo = msg.photo![msg.photo!.length - 1];
    await updateUser(telegramId, { photoFileId: photo.file_id, mediaType: "photo" });
    setState(telegramId, "idle");
    await bot.sendMessage(msg.chat.id, "✅ Foto berhasil diubah!", { reply_markup: mainMenuKeyboard });
  }
}

export async function handleVideo(bot: TelegramBot, msg: TelegramBot.Message) {
  if (!msg.from) return;
  const telegramId = String(msg.from.id);
  const state = getState(telegramId);

  if (state === "await_photo") {
    setTempData(telegramId, { photoFileId: msg.video!.file_id, mediaType: "video" });
    await finishRegistration(bot, msg, telegramId);
  } else if (state === "await_edit_photo") {
    await updateUser(telegramId, { photoFileId: msg.video!.file_id, mediaType: "video" });
    setState(telegramId, "idle");
    await bot.sendMessage(msg.chat.id, "✅ Video berhasil diubah!", { reply_markup: mainMenuKeyboard });
  }
}

async function finishRegistration(bot: TelegramBot, msg: TelegramBot.Message, telegramId: string) {
  const temp = getTempData(telegramId);
  const username = msg.from?.username;

  let invitedBy: string | undefined;
  if (temp.inviteCode) {
    const inviter = await getUserByInviteCode(temp.inviteCode);
    if (inviter) {
      invitedBy = inviter.telegramId;
    }
  }

  const user = await createUser({
    telegramId,
    username,
    name: temp.name,
    gender: temp.gender as "pria" | "wanita",
    interest: temp.interest as "pria" | "wanita",
    age: parseInt(temp.age),
    bio: temp.bio || undefined,
    location: temp.location || undefined,
    photoFileId: temp.photoFileId || undefined,
    mediaType: temp.mediaType || undefined,
    invitedBy,
  });

  if (invitedBy) {
    await addInviteLimit(invitedBy);
    try {
      const inviterUser = await getUser(invitedBy);
      await bot.sendMessage(Number(invitedBy),
        `🎉 Temanmu *${user.name}* baru saja bergabung menggunakan link undanganmu!\n\n+10 limit harian ditambahkan. Limit kamu sekarang: *${inviterUser?.dailyLimit || 40}* profil/hari 🚀`,
        { parse_mode: "Markdown" }
      );
    } catch {
    }
  }

  clearTempData(telegramId);
  setState(telegramId, "idle");

  const caption = formatProfile(user);
  if (user.photoFileId) {
    if (user.mediaType === "video") {
      await bot.sendVideo(msg.chat.id, user.photoFileId, {
        caption: `🎉 *Profil berhasil dibuat!*\n\n` + caption + `\n\nSekarang kamu bisa mulai mencari kenalan! 🚀`,
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard,
      });
    } else {
      await bot.sendPhoto(msg.chat.id, user.photoFileId, {
        caption: `🎉 *Profil berhasil dibuat!*\n\n` + caption + `\n\nSekarang kamu bisa mulai mencari kenalan! 🚀`,
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard,
      });
    }
  } else {
    await bot.sendMessage(msg.chat.id,
      `🎉 *Profil berhasil dibuat!*\n\n` + caption + `\n\nSekarang kamu bisa mulai mencari kenalan! 🚀`,
      { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
    );
  }
}
