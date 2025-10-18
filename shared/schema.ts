import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  dueDate: timestamp("due_date", { mode: "date" }),
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
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: varchar("color", { length: 20 }).default("purple"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const aiInsights = pgTable("ai_insights", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().default(sql`now()`),
});

export const taskTemplates = pgTable("task_templates", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
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
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in-progress", "completed", "archived"]).default("todo"),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.string().optional(),
  // Transform date strings from JSON to Date objects
  dueDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  completedAt: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
  recurrenceEndDate: z.union([z.date(), z.string().transform((str) => new Date(str))]).optional(),
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
  createdAt: true,
}).extend({
  name: z.string().min(1, "Project name is required"),
});

export const insertAIInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Template name is required"),
  title: z.string().min(1, "Task title is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.string().optional(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type AIInsight = typeof aiInsights.$inferSelect;
export type InsertAIInsight = z.infer<typeof insertAIInsightSchema>;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = z.infer<typeof insertTaskTemplateSchema>;
