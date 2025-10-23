import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, numeric, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for email/password and OAuth authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"), // Nullable for OAuth users
  googleId: varchar("google_id").unique(), // Google OAuth ID
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  hasAIAccess: boolean("has_ai_access").default(true).notNull(),
  pushNotificationsEnabled: boolean("push_notifications_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  dueDate: timestamp("due_date", { mode: "date" }),
  deadlineDateTime: timestamp("deadline_date_time"),
  projectId: varchar("project_id", { length: 255 }),
  isAISuggested: boolean("is_ai_suggested").default(false),
  aiCategory: text("ai_category"),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
  
  // Recurring task fields
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: varchar("recurrence_pattern", { length: 20 }),
  recurrenceInterval: varchar("recurrence_interval", { length: 10 }),
  recurrenceEndDate: timestamp("recurrence_end_date", { mode: "date" }),
  recurrenceEndCount: varchar("recurrence_end_count", { length: 10 }),
  parentTaskId: varchar("parent_task_id", { length: 255 }),
  
  // Task decomposition fields
  hours: numeric("hours", { precision: 5, scale: 2 }),
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  color: varchar("color", { length: 20 }).default("purple"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const aiInsights = pgTable("ai_insights", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const taskTemplates = pgTable("task_templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  projectId: varchar("project_id", { length: 255 }),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: varchar("recurrence_pattern", { length: 20 }),
  recurrenceInterval: varchar("recurrence_interval", { length: 10 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const quotaUsage = pgTable("quota_usage", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  featureType: varchar("feature_type", { length: 50 }).notNull().default("ai_decompose"),
  month: varchar("month", { length: 10 }).notNull(), // Supports both YYYY-MM (7) and YYYY-MM-DD (10)
  callCount: integer("call_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  focusSprintEnabled: boolean("focus_sprint_enabled").default(false),
  focusSprintSound: varchar("focus_sprint_sound", { length: 50 }).default("soft-chime"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const userStats = pgTable("user_stats", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  sprintsCompleted: integer("sprints_completed").notNull().default(0),
  lastReorganizeAt: timestamp("last_reorganize_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const pushTokens = pgTable("push_tokens", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  token: text("token").notNull(),
  platform: varchar("platform", { length: 20 }).notNull(), // "android" or "ios"
  deviceId: text("device_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().default(sql`now()`),
});

// Relations
export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks),
  templates: many(taskTemplates),
}));

export const taskTemplatesRelations = relations(taskTemplates, ({ one }) => ({
  project: one(projects, {
    fields: [taskTemplates.projectId],
    references: [projects.id],
  }),
}));

const baseTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in-progress", "completed", "archived"]).default("todo"),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.string().optional(),
  // Transform date strings from JSON to Date objects
  dueDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  deadlineDateTime: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional().nullable(),
  completedAt: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  recurrenceEndDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  // Allow hours as string, number, or null (Drizzle handles conversion)
  hours: z.string().optional().nullable(),
});

export const insertTaskSchema = baseTaskSchema.refine((data) => {
  // If task is recurring, due date is required
  if (data.isRecurring && !data.dueDate) {
    return false;
  }
  return true;
}, {
  message: "Due date is required for recurring tasks",
  path: ["dueDate"],
});

export const updateTaskSchema = baseTaskSchema.partial();

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Project name is required"),
});

export const insertAIInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Template name is required"),
  title: z.string().min(1, "Task title is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.string().optional(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  focusSprintSound: z.enum(["soft-chime", "white-noise", "nature-sounds"]).default("soft-chime"),
});

export const insertUserStatsSchema = createInsertSchema(userStats).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  token: z.string().min(1, "FCM token is required"),
  platform: z.enum(["android", "ios"]),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type AIInsight = typeof aiInsights.$inferSelect;
export type InsertAIInsight = z.infer<typeof insertAIInsightSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
export type QuotaUsage = typeof quotaUsage.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type PushToken = typeof pushTokens.$inferSelect;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// Auth schemas
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignupData = z.infer<typeof signupSchema>;
export type LoginData = z.infer<typeof loginSchema>;
