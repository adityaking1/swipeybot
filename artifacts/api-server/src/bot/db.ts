import { randomBytes } from "crypto";
import { connectMongo, UserModel, LikeModel, MatchModel, MessageModel } from "./mongo.js";

async function db() {
  await connectMongo();
}

export function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function getUser(telegramId: string) {
  await db();
  return UserModel.findOne({ telegramId }).lean();
}

export async function getUserByInviteCode(code: string) {
  await db();
  return UserModel.findOne({ inviteCode: code }).lean();
}

export async function createUser(data: {
  telegramId: string;
  username?: string;
  name: string;
  gender: "pria" | "wanita";
  interest: "pria" | "wanita";
  age: number;
  bio?: string;
  location?: string;
  photoFileId?: string;
  mediaType?: string;
  invitedBy?: string;
}) {
  await db();
  const inviteCode = generateInviteCode();
  const today = new Date().toISOString().slice(0, 10);
  const user = await UserModel.create({
    ...data,
    inviteCode,
    dailyLimit: 30,
    dailyUsed: 0,
    inviteCount: 0,
    lastResetDate: today,
    isActive: true,
  });
  return user.toObject();
}

export async function updateUser(telegramId: string, data: Partial<{
  name: string;
  gender: "pria" | "wanita";
  interest: "pria" | "wanita";
  age: number;
  bio: string;
  location: string;
  photoFileId: string;
  mediaType: string;
  username: string;
}>) {
  await db();
  return UserModel.findOneAndUpdate({ telegramId }, { $set: data }, { new: true }).lean();
}

export async function checkAndResetDailyLimit(telegramId: string) {
  await db();
  const user = await UserModel.findOne({ telegramId }).lean();
  if (!user) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (user.lastResetDate !== today) {
    return UserModel.findOneAndUpdate(
      { telegramId },
      { $set: { dailyUsed: 0, lastResetDate: today } },
      { new: true }
    ).lean();
  }
  return user;
}

export async function incrementDailyUsed(telegramId: string) {
  await db();
  return UserModel.findOneAndUpdate(
    { telegramId },
    { $inc: { dailyUsed: 1 } },
    { new: true }
  ).lean();
}

export async function addInviteLimit(inviterTelegramId: string) {
  await db();
  await UserModel.findOneAndUpdate(
    { telegramId: inviterTelegramId },
    { $inc: { inviteCount: 1, dailyLimit: 10 } }
  );
}

export async function getNextCandidate(viewerTelegramId: string, interestedIn: "pria" | "wanita") {
  await db();
  const alreadySeen = await LikeModel.find({ fromUserId: viewerTelegramId }).select("toUserId").lean();
  const seenIds = alreadySeen.map(r => r.toUserId);
  seenIds.push(viewerTelegramId);

  const viewer = await UserModel.findOne({ telegramId: viewerTelegramId }).select("location").lean();
  const viewerLocation = viewer?.location;

  const baseQuery = {
    gender: interestedIn,
    isActive: true,
    telegramId: { $nin: seenIds },
  };

  if (viewerLocation) {
    const sameLocationCandidates = await UserModel.find({
      ...baseQuery,
      location: viewerLocation,
    }).limit(100).lean();

    if (sameLocationCandidates.length > 0) {
      return sameLocationCandidates[Math.floor(Math.random() * sameLocationCandidates.length)];
    }
  }

  const otherCandidates = await UserModel.find({
    ...baseQuery,
    ...(viewerLocation ? { location: { $ne: viewerLocation } } : {}),
  }).limit(100).lean();

  if (otherCandidates.length === 0) return null;
  return otherCandidates[Math.floor(Math.random() * otherCandidates.length)];
}

export async function recordLike(fromUserId: string, toUserId: string, isLike: boolean) {
  await db();
  await LikeModel.findOneAndUpdate(
    { fromUserId, toUserId },
    { $set: { isLike } },
    { upsert: true }
  );
}

export async function checkMutualLike(user1Id: string, user2Id: string): Promise<boolean> {
  await db();
  const like1 = await LikeModel.findOne({ fromUserId: user1Id, toUserId: user2Id, isLike: true });
  const like2 = await LikeModel.findOne({ fromUserId: user2Id, toUserId: user1Id, isLike: true });
  return !!(like1 && like2);
}

export async function createMatch(user1Id: string, user2Id: string) {
  await db();
  const existing = await MatchModel.findOne({
    $or: [
      { user1Id, user2Id },
      { user1Id: user2Id, user2Id: user1Id },
    ],
  }).lean();
  if (existing) return existing;
  return (await MatchModel.create({ user1Id, user2Id })).toObject();
}

export async function isMatched(user1Id: string, user2Id: string): Promise<boolean> {
  await db();
  const result = await MatchModel.findOne({
    $or: [
      { user1Id, user2Id },
      { user1Id: user2Id, user2Id: user1Id },
    ],
  });
  return !!result;
}

export async function resetAllDailyLimits() {
  await db();
  const today = new Date().toISOString().slice(0, 10);
  await UserModel.updateMany({}, { $set: { dailyUsed: 0, lastResetDate: today } });
}

export async function hasAlreadyLiked(fromUserId: string, toUserId: string): Promise<boolean> {
  await db();
  const result = await LikeModel.findOne({ fromUserId, toUserId });
  return !!result;
}

export async function saveMessage(fromUserId: string, toUserId: string, content: string) {
  await db();
  await MessageModel.create({ fromUserId, toUserId, content });
}

export async function claimGroupBonus(telegramId: string) {
  await db();
  return UserModel.findOneAndUpdate(
    { telegramId },
    { $set: { groupBonusClaimed: true }, $inc: { dailyLimit: 10 } },
    { new: true }
  ).lean();
}
