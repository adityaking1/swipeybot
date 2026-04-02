/**
 * Seed 30 fake users into MongoDB.
 * Run from project root:
 *   node scripts/seed-fake-users.mjs
 */
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const mongoose = require("/home/runner/workspace/artifacts/api-server/node_modules/mongoose");

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

await mongoose.connect(uri);
console.log("Connected to MongoDB");

const UserSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  name: { type: String, required: true },
  gender: { type: String, enum: ["pria", "wanita"], required: true },
  interest: { type: String, enum: ["pria", "wanita"], required: true },
  age: { type: Number, required: true },
  bio: String,
  location: String,
  photoFileId: String,
  mediaType: String,
  dailyLimit: { type: Number, default: 30 },
  dailyUsed: { type: Number, default: 0 },
  inviteCount: { type: Number, default: 0 },
  inviteCode: { type: String, required: true, unique: true },
  invitedBy: String,
  lastResetDate: String,
  isActive: { type: Boolean, default: true },
  groupBonusClaimed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model("User", UserSchema);

function genCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

const today = new Date().toISOString().slice(0, 10);

// 30 fake users — ordered by the user's list
// gender assigned based on typical Indonesian names
// most are wanita, a few are pria
const fakeUsers = [
  { idx: 1,  name: "alfi",       gender: "pria",   interest: "wanita", age: 21, bio: "Halo! Aku alfi 😄",            location: "Jakarta"   },
  { idx: 2,  name: "din",        gender: "pria",   interest: "wanita", age: 22, bio: "Suka ngobrol & nongkrong",     location: "Bandung"   },
  { idx: 3,  name: "saa",        gender: "wanita", interest: "pria",   age: 20, bio: "Suka kucing & musik",          location: "Surabaya"  },
  { idx: 4,  name: "clara",      gender: "wanita", interest: "pria",   age: 19, bio: "Pecinta drama korea ✨",        location: "Jakarta"   },
  { idx: 5,  name: "hana",       gender: "wanita", interest: "pria",   age: 21, bio: "Suka traveling & kuliner",     location: "Yogyakarta"},
  { idx: 6,  name: "tataa",      gender: "wanita", interest: "pria",   age: 22, bio: "Random tapi seru 😂",          location: "Semarang"  },
  { idx: 7,  name: "reyna",      gender: "wanita", interest: "pria",   age: 20, bio: "Introvert yang hangat 🌸",     location: "Malang"    },
  { idx: 8,  name: "ayaa",       gender: "wanita", interest: "pria",   age: 18, bio: "Hobi baca & nonton film",      location: "Depok"     },
  { idx: 9,  name: "aulia",      gender: "wanita", interest: "pria",   age: 21, bio: "Suka nulis & kopi ☕",          location: "Bogor"     },
  { idx: 10, name: "lovycie",    gender: "wanita", interest: "pria",   age: 23, bio: "Aesthetic vibes 🌙",            location: "Bekasi"    },
  { idx: 11, name: "siapa ya",   gender: "wanita", interest: "pria",   age: 20, bio: "Hehe cari tau aja 😏",         location: "Jakarta"   },
  { idx: 12, name: "caa",        gender: "wanita", interest: "pria",   age: 19, bio: "Suka selfie & cafe hopping",   location: "Tangerang" },
  { idx: 13, name: "nadyaa",     gender: "wanita", interest: "pria",   age: 22, bio: "Dreamer & overthinker 💭",     location: "Surabaya"  },
  { idx: 14, name: "araa",       gender: "wanita", interest: "pria",   age: 21, bio: "Suka alam & hiking 🏔️",        location: "Bandung"   },
  { idx: 15, name: "pacarmu",    gender: "wanita", interest: "pria",   age: 20, bio: "Siapa tau jodoh 😊",           location: "Jakarta"   },
  { idx: 16, name: "nadd",       gender: "wanita", interest: "pria",   age: 22, bio: "Suka game & anime 🎮",         location: "Medan"     },
  { idx: 17, name: "anggita",    gender: "wanita", interest: "pria",   age: 23, bio: "Hobi masak & nonton",          location: "Solo"      },
  { idx: 18, name: "ayy",        gender: "wanita", interest: "pria",   age: 19, bio: "Ceria & aktif 🌟",             location: "Makassar"  },
  { idx: 19, name: "call aja",   gender: "wanita", interest: "pria",   age: 21, bio: "Suka ngobrol panjang 📱",      location: "Palembang" },
  { idx: 20, name: "Iyey",       gender: "wanita", interest: "pria",   age: 20, bio: "Lucu & apa adanya 😄",         location: "Balikpapan"},
  { idx: 21, name: "zee",        gender: "wanita", interest: "pria",   age: 22, bio: "Minimalis tapi elegan ✨",     location: "Jakarta"   },
  { idx: 22, name: "shasa",      gender: "wanita", interest: "pria",   age: 20, bio: "Hobi bikin konten 📸",         location: "Bali"      },
  { idx: 23, name: "cimol",      gender: "wanita", interest: "pria",   age: 19, bio: "Nama lucu tapi orangnya serius 😂", location: "Bandung" },
  { idx: 24, name: "wawa",       gender: "wanita", interest: "pria",   age: 21, bio: "Suka jogging & gym 💪",        location: "Surabaya"  },
  { idx: 25, name: "nana",       gender: "wanita", interest: "pria",   age: 20, bio: "Kalem tapi seru diajak ngobrol", location: "Jakarta"  },
  { idx: 26, name: "agissss",    gender: "pria",   interest: "wanita", age: 23, bio: "Suka olahraga & musik",        location: "Bandung"   },
  { idx: 27, name: "petrichor",  gender: "pria",   interest: "wanita", age: 22, bio: "Suka hujan & kopi 🌧️☕",       location: "Yogyakarta"},
  { idx: 28, name: "matchaaa",   gender: "wanita", interest: "pria",   age: 21, bio: "Matcha lover 🍵",              location: "Jakarta"   },
  { idx: 29, name: "dewi",       gender: "wanita", interest: "pria",   age: 22, bio: "Suka buku & film indie 📚",    location: "Malang"    },
  { idx: 30, name: "put",        gender: "wanita", interest: "pria",   age: 20, bio: "Santai & easygoing 😊",        location: "Semarang"  },
];

let inserted = 0;
let skipped = 0;
let updated = 0;

for (const u of fakeUsers) {
  const telegramId = `fake_${String(u.idx).padStart(3, "0")}`;
  const existing = await User.findOne({ telegramId }).lean();

  if (existing) {
    // Update name/bio/gender/interest/age/location if changed, but keep photoFileId
    await User.updateOne({ telegramId }, {
      $set: {
        name: u.name,
        gender: u.gender,
        interest: u.interest,
        age: u.age,
        bio: u.bio,
        location: u.location,
        isActive: true,
      }
    });
    console.log(`  [UPDATED] ${telegramId} → ${u.name}`);
    updated++;
  } else {
    let inviteCode;
    let tries = 0;
    do {
      inviteCode = genCode();
      tries++;
    } while (await User.findOne({ inviteCode }).lean() && tries < 10);

    await User.create({
      telegramId,
      name: u.name,
      gender: u.gender,
      interest: u.interest,
      age: u.age,
      bio: u.bio,
      location: u.location,
      inviteCode,
      dailyLimit: 30,
      dailyUsed: 0,
      inviteCount: 0,
      lastResetDate: today,
      isActive: true,
      groupBonusClaimed: false,
    });
    console.log(`  [INSERTED] ${telegramId} → ${u.name}`);
    inserted++;
  }
}

const total = await User.countDocuments({});
console.log(`\nDone! Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);
console.log(`Total users in DB: ${total}`);

// Show who is missing a photo
const noPhoto = await User.find({ telegramId: /^fake_/, photoFileId: { $exists: false } }).lean();
if (noPhoto.length > 0) {
  console.log(`\n⚠️  ${noPhoto.length} fake users still missing a photo:`);
  noPhoto.forEach(u => console.log(`   ${u.telegramId} → ${u.name}`));
  console.log("\nUse /adminphoto in the bot to assign photos.");
}

await mongoose.disconnect();
