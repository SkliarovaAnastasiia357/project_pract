import { sql } from "drizzle-orm";
import { check, index, inet, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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

export const skills = pgTable("skills", {
  id:             uuid("id").primaryKey().defaultRandom(),
  name:           text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byNormalizedName: uniqueIndex("skills_normalized_name_idx").on(t.normalizedName),
}));

export const userSkills = pgTable("user_skills", {
  userId:  uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.skillId] }),
  bySkill: index("user_skills_skill_id_idx").on(t.skillId),
}));

export const projects = pgTable("projects", {
  id:          uuid("id").primaryKey().defaultRandom(),
  ownerId:     uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:       text("title").notNull(),
  description: text("description").notNull(),
  stack:       text("stack").notNull().default(""),
  roles:       text("roles").notNull().default(""),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byOwner: index("projects_owner_id_idx").on(t.ownerId),
  byUpdated: index("projects_updated_at_idx").on(t.updatedAt),
}));

export const projectApplications = pgTable("project_applications", {
  id:          uuid("id").primaryKey().defaultRandom(),
  projectId:   uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  applicantId: uuid("applicant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message:     text("message").notNull().default(""),
  status:      text("status").notNull().default("pending"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byProject: index("project_applications_project_id_idx").on(t.projectId),
  byApplicant: index("project_applications_applicant_id_idx").on(t.applicantId),
  oneApplicationPerProject: uniqueIndex("project_applications_project_applicant_idx").on(t.projectId, t.applicantId),
  validStatus: check("project_applications_status_check", sql`${t.status} in ('pending', 'accepted', 'rejected')`),
}));

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type SkillRow = typeof skills.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectApplicationRow = typeof projectApplications.$inferSelect;
