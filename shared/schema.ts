import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  dueDate: timestamp("due_date"),
  projectId: varchar("project_id"),
  isAISuggested: boolean("is_ai_suggested").default(false),
  aiCategory: text("ai_category"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: varchar("color", { length: 20 }).default("purple"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const aiInsights = pgTable("ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in-progress", "completed", "archived"]).default("todo"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Project name is required"),
});

export const insertAIInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type AIInsight = typeof aiInsights.$inferSelect;
export type InsertAIInsight = z.infer<typeof insertAIInsightSchema>;
