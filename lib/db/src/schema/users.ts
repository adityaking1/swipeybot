import { pgTable, text, serial, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const genderEnum = pgEnum("gender", ["pria", "wanita"]);
export const interestEnum = pgEnum("interest", ["pria", "wanita"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username"),
  name: text("name").notNull(),
  gender: genderEnum("gender").notNull(),
  interest: interestEnum("interest").notNull(),
  age: integer("age").notNull(),
  bio: text("bio"),
  photoFileId: text("photo_file_id"),
  mediaType: text("media_type"),
  dailyLimit: integer("daily_limit").notNull().default(30),
  dailyUsed: integer("daily_used").notNull().default(0),
  inviteCount: integer("invite_count").notNull().default(0),
  inviteCode: text("invite_code").notNull().unique(),
  invitedBy: text("invited_by"),
  lastResetDate: text("last_reset_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
