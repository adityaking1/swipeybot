import TelegramBot from "node-telegram-bot-api";

export const mainMenuKeyboard: TelegramBot.ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: "👤 Profil Saya" }, { text: "✏️ Ubah Profil" }],
    [{ text: "🚀 Cari Kenalan" }, { text: "📨 Undang Teman" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

export const genderKeyboard: TelegramBot.ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: "🙋‍♂️ Pria" }, { text: "🙋‍♀️ Wanita" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export const interestKeyboard: TelegramBot.ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: "👨 Tertarik pada Pria" }, { text: "👩 Tertarik pada Wanita" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export const editProfileKeyboard: TelegramBot.ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: "✏️ Nama" }, { text: "🎂 Usia" }],
    [{ text: "📝 Bio" }, { text: "📸 Foto/Video" }],
    [{ text: "🔙 Kembali" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export function browsingKeyboard(candidateId: string): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "❤️ Suka", callback_data: `like_${candidateId}` },
        { text: "👎 Tidak Suka", callback_data: `dislike_${candidateId}` },
      ],
      [
        { text: "💌 Kirim Pesan", callback_data: `msg_${candidateId}` },
        { text: "🚨 Laporkan", callback_data: `report_${candidateId}` },
      ],
    ],
  };
}

export function shareInviteKeyboard(inviteLink: string, botUsername: string): TelegramBot.InlineKeyboardMarkup {
  const text = encodeURIComponent(`Hei! Aku main SwipeyBot, bot kencan seru di Telegram! Yuk bergabung bareng aku di sini 💕`);
  const encodedLink = encodeURIComponent(inviteLink);
  return {
    inline_keyboard: [
      [
        {
          text: "📤 Bagikan via Telegram",
          url: `https://t.me/share/url?url=${encodedLink}&text=${text}`,
        },
      ],
      [
        {
          text: "💬 WhatsApp",
          url: `https://wa.me/?text=${text}%20${encodedLink}`,
        },
        {
          text: "🐦 Twitter/X",
          url: `https://twitter.com/intent/tweet?text=${text}%20${encodedLink}`,
        },
      ],
      [
        {
          text: "📋 Salin Link",
          callback_data: `copy_invite`,
        },
      ],
    ],
  };
}

export const cancelKeyboard: TelegramBot.ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: "❌ Batal" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};
