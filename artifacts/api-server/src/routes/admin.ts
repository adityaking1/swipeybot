import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import { createAdminToken } from "../lib/adminAuth.js";
import { connectMongo, UserModel, LikeModel, MatchModel } from "../bot/mongo.js";

const router = Router();

router.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Password salah" });
    return;
  }
  const token = createAdminToken();
  res.json({ token });
});

router.get("/stats", requireAdmin, async (_req, res) => {
  await connectMongo();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, activeUsers, totalMatches, newToday, maleCount, femaleCount, ageAgg] =
    await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ isActive: true }),
      MatchModel.countDocuments({}),
      UserModel.countDocuments({ createdAt: { $gte: today } }),
      UserModel.countDocuments({ gender: "pria" }),
      UserModel.countDocuments({ gender: "wanita" }),
      UserModel.aggregate([{ $group: { _id: null, avgAge: { $avg: "$age" } } }]),
    ]);

  const avgAge = ageAgg[0]?.avgAge ? Math.round(ageAgg[0].avgAge) : 0;

  res.json({ totalUsers, activeUsers, totalMatches, newToday, maleCount, femaleCount, avgAge });
});

router.get("/users", requireAdmin, async (req, res) => {
  await connectMongo();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = (req.query.search as string) || "";
  const gender = (req.query.gender as string) || "";
  const status = (req.query.status as string) || "";

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { telegramId: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ];
  }
  if (gender) filter.gender = gender;
  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  const [total, users] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

router.get("/users/:telegramId", requireAdmin, async (req, res) => {
  await connectMongo();
  const user = await UserModel.findOne({ telegramId: req.params.telegramId }).lean();
  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  const [likesGiven, likesReceived, matchCount] = await Promise.all([
    LikeModel.countDocuments({ fromUserId: req.params.telegramId }),
    LikeModel.countDocuments({ toUserId: req.params.telegramId }),
    MatchModel.countDocuments({
      $or: [{ user1Id: req.params.telegramId }, { user2Id: req.params.telegramId }],
    }),
  ]);

  res.json({ user, likesGiven, likesReceived, matchCount });
});

router.patch("/users/:telegramId", requireAdmin, async (req, res) => {
  await connectMongo();
  const update = req.body as { isActive?: boolean; dailyLimit?: number };
  const allowed: Record<string, unknown> = {};
  if (typeof update.isActive === "boolean") allowed.isActive = update.isActive;
  if (typeof update.dailyLimit === "number") allowed.dailyLimit = update.dailyLimit;

  const user = await UserModel.findOneAndUpdate(
    { telegramId: req.params.telegramId },
    { $set: allowed },
    { new: true }
  ).lean();

  if (!user) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }
  res.json({ user });
});

router.delete("/users/:telegramId", requireAdmin, async (req, res) => {
  await connectMongo();
  const { telegramId } = req.params;
  await Promise.all([
    UserModel.deleteOne({ telegramId }),
    LikeModel.deleteMany({ $or: [{ fromUserId: telegramId }, { toUserId: telegramId }] }),
    MatchModel.deleteMany({ $or: [{ user1Id: telegramId }, { user2Id: telegramId }] }),
  ]);
  res.json({ success: true });
});

router.get("/matches", requireAdmin, async (req, res) => {
  await connectMongo();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const [total, matches] = await Promise.all([
    MatchModel.countDocuments({}),
    MatchModel.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  const userIds = matches.flatMap((m) => [m.user1Id, m.user2Id]);
  const users = await UserModel.find({ telegramId: { $in: userIds } }).lean();
  const userMap = Object.fromEntries(users.map((u) => [u.telegramId, u]));

  const enriched = matches.map((m) => ({
    ...m,
    user1: userMap[m.user1Id] || null,
    user2: userMap[m.user2Id] || null,
  }));

  res.json({ matches: enriched, total, page, pages: Math.ceil(total / limit) });
});

router.get("/photos/:fileId", requireAdmin, async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).send("Bot token tidak tersedia");
    return;
  }
  try {
    const fileRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${req.params.fileId}`
    );
    const fileData = (await fileRes.json()) as { ok: boolean; result?: { file_path: string } };
    if (!fileData.ok || !fileData.result?.file_path) {
      res.status(404).send("Foto tidak ditemukan");
      return;
    }
    const photoRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`
    );
    res.setHeader("Content-Type", photoRes.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const buf = await photoRes.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch {
    res.status(500).send("Gagal mengambil foto");
  }
});

export default router;
