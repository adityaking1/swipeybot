import mongoose, { Schema, Document, Model } from "mongoose";
import { logger } from "../lib/logger.js";

let isConnected = false;

export async function connectMongo() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("MONGODB_URI is not set!");
    throw new Error("MONGODB_URI is required");
  }
  await mongoose.connect(uri);
  isConnected = true;
  logger.info("Connected to MongoDB");
}

export interface IUser extends Document {
  telegramId: string;
  username?: string;
  name: string;
  gender: "pria" | "wanita";
  interest: "pria" | "wanita";
  age: number;
  bio?: string;
  photoFileId?: string;
  mediaType?: string;
  dailyLimit: number;
  dailyUsed: number;
  inviteCount: number;
  inviteCode: string;
  invitedBy?: string;
  lastResetDate?: string;
  isActive: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  name: { type: String, required: true },
  gender: { type: String, enum: ["pria", "wanita"], required: true },
  interest: { type: String, enum: ["pria", "wanita"], required: true },
  age: { type: Number, required: true },
  bio: String,
  photoFileId: String,
  mediaType: String,
  dailyLimit: { type: Number, default: 30 },
  dailyUsed: { type: Number, default: 0 },
  inviteCount: { type: Number, default: 0 },
  inviteCode: { type: String, required: true, unique: true },
  invitedBy: String,
  lastResetDate: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export interface ILike extends Document {
  fromUserId: string;
  toUserId: string;
  isLike: boolean;
  createdAt: Date;
}

const LikeSchema = new Schema<ILike>({
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },
  isLike: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },
});
LikeSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export interface IMatch extends Document {
  user1Id: string;
  user2Id: string;
  createdAt: Date;
}

const MatchSchema = new Schema<IMatch>({
  user1Id: { type: String, required: true },
  user2Id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export interface IMessage extends Document {
  fromUserId: string;
  toUserId: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  fromUserId: { type: String, required: true },
  toUserId: { type: String, required: true },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export const LikeModel: Model<ILike> = mongoose.models.Like || mongoose.model<ILike>("Like", LikeSchema);
export const MatchModel: Model<IMatch> = mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);
export const MessageModel: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
