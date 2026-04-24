import { pgTable, uuid, text, timestamp, inet, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  email:        text("email").notNull().unique(),
  name:         text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  bio:          text("bio").notNull().default(""),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash:    text("token_hash").notNull().unique(),
  replacedById: uuid("replaced_by_id"),
  userAgent:    text("user_agent"),
  ip:           inet("ip"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt:   timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt:    timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt:    timestamp("revoked_at", { withTimezone: true }),
}, (t) => ({
  byUser:    index("sessions_user_id_idx").on(t.userId),
  byExpires: index("sessions_expires_at_idx").on(t.expiresAt),
}));

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
