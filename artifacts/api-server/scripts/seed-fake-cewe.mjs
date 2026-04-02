/**
 * Seed 30 fake female users from Telegram group photos.
 * Run: node scripts/seed-fake-cewe.mjs
 *
 * Requirements:
 *   - TELEGRAM_BOT_TOKEN set in environment
 *   - MONGODB_URI set in environment
 *   - Bot is a member of the group @swp_dtbs
 *   - 30 photos already uploaded to the group
 */

import mongoose from "mongoose";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const GROUP_USERNAME = "@swp_dtbs";

if (!BOT_TOKEN) { console.error("❌ TELEGRAM_BOT_TOKEN tidak ditemukan!"); process.exit(1); }
if (!MONGODB_URI) { console.error("❌ MONGODB_URI tidak ditemukan!"); process.exit(1); }

// ── Helper Telegram API ────────────────────────────────────────────────────────
async function tg(method, params = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error [${method}]: ${data.description}`);
  return data.result;
}

// ── Mongoose Schema (mirror dari bot/mongo.ts) ─────────────────────────────────
const UserSchema = new mongoose.Schema({
  telegramId:       { type: String, required: true, unique: true },
  username:         String,
  name:             { type: String, required: true },
  gender:           { type: String, enum: ["pria", "wanita"], required: true },
  interest:         { type: String, enum: ["pria", "wanita"], required: true },
  age:              { type: Number, required: true },
  bio:              String,
  location:         String,
  photoFileId:      String,
  mediaType:        String,
  dailyLimit:       { type: Number, default: 30 },
  dailyUsed:        { type: Number, default: 0 },
  inviteCount:      { type: Number, default: 0 },
  inviteCode:       { type: String, required: true, unique: true },
  invitedBy:        String,
  lastResetDate:    String,
  isActive:         { type: Boolean, default: true },
  groupBonusClaimed:{ type: Boolean, default: false },
  isFake:           { type: Boolean, default: false },   // ← penanda akun palsu
  createdAt:        { type: Date, default: Date.now },
});

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

// ── Data ──────────────────────────────────────────────────────────────────────
const NAMES = [
  "Alfi", "Din", "Saa", "Clara", "Hana",
  "Tataa", "Reyna", "Ayaa", "Aulia", "Lovycie",
  "Siapa Ya", "Caa", "Nadyaa", "Araa", "Pacarmu",
  "Nadd", "Anggita", "Ayy", "Call Aja", "Iyey",
  "Zee", "Shasa", "Cimol", "Wawa", "Nana",
  "Agissss", "Petrichor", "Matchaaa", "Dewi", "Put",
];

const LOCATIONS = [
  "Jakarta", "Bandung", "Surabaya", "Yogyakarta", "Medan",
  "Semarang", "Makassar", "Malang", "Denpasar", "Bogor",
  "Tangerang", "Bekasi", "Depok", "Pekanbaru", "Palembang",
];

const BIOS = [
  "Suka kopi dan sunsets ☕🌅",
  "Introvert tapi suka jalan-jalan 🌿",
  "Pecinta kucing dan anime 🐱",
  "Foodie sejati, halal food hunter 🍜",
  "Suka baca, nulis, dan nonton film 📚",
  "Santai aja, yang penting happy 😊",
  "Traveler dadakan, suka explore tempat baru ✈️",
  "Gym enthusiast & healthy lifestyle 💪",
  "INFJ | suka ngobrol hal-hal bermakna 🌙",
  "Kadang serius, kadang random 🎲",
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomAge(min = 18, max = 26) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomInviteCode() { return Math.random().toString(36).substring(2, 10).toUpperCase(); }
function fakeTelegramId() { return `fake_${Date.now()}_${Math.floor(Math.random() * 99999)}`; }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Memulai seed data fake cewe...\n");

  // 1. Nonaktifkan webhook sementara agar getUpdates bisa dipakai
  console.log("⏸  Menonaktifkan webhook sementara...");
  try { await tg("deleteWebhook"); console.log("   ✅ Webhook dinonaktifkan"); }
  catch (e) { console.log("   ⚠️  Gagal nonaktifkan webhook:", e.message); }

  // 2. Ambil info grup
  console.log(`\n📡 Mengambil info grup ${GROUP_USERNAME}...`);
  const chat = await tg("getChat", { chat_id: GROUP_USERNAME });
  const groupChatId = chat.id;
  console.log(`   ✅ Grup ditemukan: "${chat.title}" (ID: ${groupChatId})`);

  // 3. Ambil updates untuk mendapatkan file_id foto dari grup
  console.log("\n📸 Mengambil foto dari grup...");
  let allUpdates = [];
  let offset = 0;

  // Ambil semua pending updates
  for (let i = 0; i < 10; i++) {
    const updates = await tg("getUpdates", { offset, limit: 100, timeout: 5 });
    if (!updates.length) break;
    allUpdates = allUpdates.concat(updates);
    offset = updates[updates.length - 1].update_id + 1;
  }

  console.log(`   Total updates diterima: ${allUpdates.length}`);

  // Filter foto dari grup target
  const photoUpdates = allUpdates.filter(u => {
    const msg = u.message || u.channel_post;
    return msg && String(msg.chat.id) === String(groupChatId) && msg.photo;
  });

  console.log(`   Foto dari grup: ${photoUpdates.length} foto`);

  if (photoUpdates.length === 0) {
    console.error("\n❌ Tidak ada foto ditemukan dari grup.");
    console.error("   Pastikan:");
    console.error("   1. Bot sudah ditambahkan ke grup @swp_dtbs");
    console.error("   2. Foto dikirim SETELAH bot bergabung");
    console.error("   3. Webhook belum pernah aktif sebelum foto dikirim");
    process.exit(1);
  }

  // Ambil file_id terbesar (kualitas tertinggi) dari setiap foto
  const fileIds = photoUpdates.map(u => {
    const photos = (u.message || u.channel_post).photo;
    return photos[photos.length - 1].file_id; // ukuran terbesar
  });

  console.log(`   ✅ ${fileIds.length} file_id berhasil diambil`);

  // 4. Koneksi MongoDB
  console.log("\n🍃 Menghubungkan ke MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("   ✅ Terhubung ke MongoDB");

  // 5. Hapus data fake cewe yang sudah ada sebelumnya (jika ada)
  const deleted = await UserModel.deleteMany({ isFake: true, gender: "wanita" });
  if (deleted.deletedCount > 0) {
    console.log(`   🗑  Hapus ${deleted.deletedCount} data fake cewe lama`);
  }

  // 6. Buat 30 user fake cewe
  console.log("\n👩 Membuat 30 user fake cewe...");
  const usedInviteCodes = new Set();
  const usersToCreate = [];

  for (let i = 0; i < NAMES.length; i++) {
    let inviteCode;
    do { inviteCode = randomInviteCode(); } while (usedInviteCodes.has(inviteCode));
    usedInviteCodes.add(inviteCode);

    // Gunakan foto sesuai urutan, kalau foto kurang dari 30 pakai secara berulang
    const photoFileId = fileIds[i % fileIds.length];

    usersToCreate.push({
      telegramId:        fakeTelegramId(),
      name:              NAMES[i],
      gender:            "wanita",
      interest:          "pria",
      age:               randomAge(18, 26),
      bio:               randomItem(BIOS),
      location:          randomItem(LOCATIONS),
      photoFileId,
      mediaType:         "photo",
      dailyLimit:        30,
      dailyUsed:         0,
      inviteCount:       0,
      inviteCode,
      isActive:          true,
      groupBonusClaimed: false,
      isFake:            true,
      createdAt:         new Date(),
    });
  }

  await UserModel.insertMany(usersToCreate);
  console.log(`   ✅ ${usersToCreate.length} user fake cewe berhasil dibuat!\n`);

  // Tampilkan ringkasan
  console.log("📋 Ringkasan user yang dibuat:");
  usersToCreate.forEach((u, i) => {
    console.log(`   ${String(i + 1).padStart(2, "0")}. ${u.name.padEnd(14)} | ${u.age} th | ${u.location}`);
  });

  // 7. Aktifkan kembali webhook jika WEBHOOK_URL ada
  if (WEBHOOK_URL) {
    console.log("\n🔗 Mengaktifkan kembali webhook...");
    try {
      await tg("setWebhook", { url: `${WEBHOOK_URL}/webhook/${BOT_TOKEN}` });
      console.log("   ✅ Webhook aktif kembali");
    } catch (e) {
      console.log("   ⚠️  Gagal aktifkan webhook:", e.message);
    }
  } else {
    console.log("\n⚠️  WEBHOOK_URL tidak di-set, webhook tidak diaktifkan kembali.");
  }

  await mongoose.disconnect();
  console.log("\n✅ Selesai! Database sekarang punya 30 fake user cewe.");
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
