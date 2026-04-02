/**
 * Upload placeholder photos for all fake users that don't have photos yet.
 * Uses randomuser.me portrait photos via Telegram sendPhoto URL method.
 * Run: node scripts/upload-fake-photos.mjs
 */
import { createRequire } from "node:module";
import https from "node:https";

const require = createRequire(import.meta.url);
const mongoose = require("/home/runner/workspace/artifacts/api-server/node_modules/mongoose");

const token = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const MONGODB_URI = process.env.MONGODB_URI;

if (!token || !ADMIN_ID || !MONGODB_URI) {
  console.error("Missing env vars"); process.exit(1);
}

await mongoose.connect(MONGODB_URI);
console.log("Connected to MongoDB");

const UserSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: String, gender: String, photoFileId: String, mediaType: String,
}, { strict: false });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

function apiPost(method, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: "api.telegram.org",
      path: "/bot" + token + "/" + method,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Stock portrait photos from randomuser.me
// Female: /women/1..99, Male: /men/1..99
const femalePhotos = [
  "https://randomuser.me/api/portraits/women/1.jpg",
  "https://randomuser.me/api/portraits/women/2.jpg",
  "https://randomuser.me/api/portraits/women/3.jpg",
  "https://randomuser.me/api/portraits/women/4.jpg",
  "https://randomuser.me/api/portraits/women/5.jpg",
  "https://randomuser.me/api/portraits/women/6.jpg",
  "https://randomuser.me/api/portraits/women/7.jpg",
  "https://randomuser.me/api/portraits/women/8.jpg",
  "https://randomuser.me/api/portraits/women/9.jpg",
  "https://randomuser.me/api/portraits/women/10.jpg",
  "https://randomuser.me/api/portraits/women/11.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/women/13.jpg",
  "https://randomuser.me/api/portraits/women/14.jpg",
  "https://randomuser.me/api/portraits/women/15.jpg",
  "https://randomuser.me/api/portraits/women/16.jpg",
  "https://randomuser.me/api/portraits/women/17.jpg",
  "https://randomuser.me/api/portraits/women/18.jpg",
  "https://randomuser.me/api/portraits/women/19.jpg",
  "https://randomuser.me/api/portraits/women/20.jpg",
  "https://randomuser.me/api/portraits/women/21.jpg",
  "https://randomuser.me/api/portraits/women/22.jpg",
  "https://randomuser.me/api/portraits/women/23.jpg",
  "https://randomuser.me/api/portraits/women/24.jpg",
  "https://randomuser.me/api/portraits/women/25.jpg",
  "https://randomuser.me/api/portraits/women/26.jpg",
];

const malePhotos = [
  "https://randomuser.me/api/portraits/men/1.jpg",
  "https://randomuser.me/api/portraits/men/2.jpg",
  "https://randomuser.me/api/portraits/men/3.jpg",
  "https://randomuser.me/api/portraits/men/4.jpg",
];

// Get all fake users without photos
const fakeUsers = await User.find({
  telegramId: /^fake_/,
  $or: [{ photoFileId: { $exists: false } }, { photoFileId: null }, { photoFileId: "" }],
}).sort({ telegramId: 1 }).lean();

console.log(`Found ${fakeUsers.length} fake users without photos.\n`);

let femaleIdx = 0;
let maleIdx = 0;
let success = 0;
let failed = 0;

for (const user of fakeUsers) {
  const photoUrl = user.gender === "pria"
    ? malePhotos[maleIdx++ % malePhotos.length]
    : femalePhotos[femaleIdx++ % femalePhotos.length];

  process.stdout.write(`  [${user.telegramId}] ${user.name} (${user.gender}) → uploading... `);

  // Send photo via URL to admin's chat
  const res = await apiPost("sendPhoto", {
    chat_id: ADMIN_ID,
    photo: photoUrl,
    caption: `[seed] ${user.name}`,
  });

  if (res.ok && res.result.photo) {
    const fileId = res.result.photo[res.result.photo.length - 1].file_id;
    const sentMsgId = res.result.message_id;

    // Save file_id to MongoDB
    await User.updateOne({ telegramId: user.telegramId }, {
      $set: { photoFileId: fileId, mediaType: "photo" },
    });

    console.log(`✅ file_id saved`);

    // Clean up: delete the photo from admin's chat
    await apiPost("deleteMessage", { chat_id: ADMIN_ID, message_id: sentMsgId });

    success++;
  } else {
    console.log(`❌ FAILED: ${res.description}`);
    failed++;
  }

  await sleep(300); // respect rate limits
}

console.log(`\n✅ Done! Success: ${success}, Failed: ${failed}`);

// Verify
const total = await User.countDocuments({ telegramId: /^fake_/, photoFileId: { $exists: true, $ne: "" } });
console.log(`Fake users with photos in DB: ${total}`);

await mongoose.disconnect();
