import {
  type Task,
  type InsertTask,
  type Project,
  type InsertProject,
  type AIInsight,
  type InsertAIInsight,
  type TaskTemplate,
  type InsertTaskTemplate,
  type UserSettings,
  type InsertUserSettings,
  type UserStats,
  type InsertUserStats,
  type PushToken,
  type InsertPushToken,
  type User,
  type UpsertUser,
  tasks,
  projects,
  aiInsights,
  taskTemplates,
  userSettings,
  userStats,
  pushTokens,
  users,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike } from "drizzle-orm";

export interface TaskFilters {
  search?: string;
  priority?: string;
  status?: string;
  projectId?: string;
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, isAdmin: boolean, hasAIAccess: boolean): Promise<User | undefined>;
  updateUserPushNotifications(id: string, enabled: boolean): Promise<User | undefined>;
  
  // Task operations
  getAllTasks(filters?: TaskFilters): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  // Project operations
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<boolean>;

  // AI Insight operations
  getAllInsights(): Promise<AIInsight[]>;
  createInsight(insight: InsertAIInsight): Promise<AIInsight>;

  // Task Template operations
  getAllTemplates(): Promise<TaskTemplate[]>;
  getTemplate(id: string): Promise<TaskTemplate | undefined>;
  createTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTemplate(id: string, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  // User Settings operations
  getUserSettings(userId?: string): Promise<UserSettings | undefined>;
  updateUserSettings(settings: Partial<InsertUserSettings>, userId?: string): Promise<UserSettings>;

  // User Stats operations
  getUserStats(userId?: string): Promise<UserStats | undefined>;
  incrementSprintCount(userId?: string): Promise<UserStats>;

  // Push Token operations
  savePushToken(token: InsertPushToken): Promise<PushToken>;
  getAllPushTokens(userId?: string): Promise<PushToken[]>;
  deletePushToken(token: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUserRole(id: string, isAdmin: boolean, hasAIAccess: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin, hasAIAccess, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPushNotifications(id: string, enabled: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ pushNotificationsEnabled: enabled, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Task operations
  async getAllTasks(filters?: TaskFilters): Promise<Task[]> {
    const conditions = [];
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(tasks.title, `%${filters.search}%`),
          ilike(tasks.description, `%${filters.search}%`)
        )
      );
    }
    
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    
    if (filters?.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }
    
    const query = db.select().from(tasks);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(tasks.createdAt));
    }
    
    return await query.orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const updateData: any = { ...updates };
    
    // Handle completion timestamp
    if (updates.status === "completed") {
      updateData.completedAt = new Date();
    } else if (updates.status) {
      updateData.completedAt = null;
    }

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    
    return task || undefined;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Project operations
  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // AI Insight operations
  async getAllInsights(): Promise<AIInsight[]> {
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt));
  }

  async createInsight(insertInsight: InsertAIInsight): Promise<AIInsight> {
    const [insight] = await db.insert(aiInsights).values(insertInsight).returning();
    return insight;
  }

  // Task Template operations
  async getAllTemplates(): Promise<TaskTemplate[]> {
    return await db.select().from(taskTemplates).orderBy(desc(taskTemplates.createdAt));
  }

  async getTemplate(id: string): Promise<TaskTemplate | undefined> {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id));
    return template || undefined;
  }

  async createTemplate(insertTemplate: InsertTaskTemplate): Promise<TaskTemplate> {
    const [template] = await db.insert(taskTemplates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: string, updates: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const [template] = await db
      .update(taskTemplates)
      .set(updates)
      .where(eq(taskTemplates.id, id))
      .returning();
    
    return template || undefined;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const result = await db.delete(taskTemplates).where(eq(taskTemplates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // User Settings operations
  async getUserSettings(userId = "default"): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async updateUserSettings(settings: Partial<InsertUserSettings>, userId = "default"): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userSettings)
        .values({ userId, ...settings })
        .returning();
      return created;
    }
  }

  // User Stats operations
  async getUserStats(userId = "default"): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats || undefined;
  }

  async incrementSprintCount(userId = "default"): Promise<UserStats> {
    const existing = await this.getUserStats(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userStats)
        .set({ 
          sprintsCompleted: existing.sprintsCompleted + 1,
          updatedAt: new Date()
        })
        .where(eq(userStats.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userStats)
        .values({ userId, sprintsCompleted: 1 })
        .returning();
      return created;
    }
  }

  // Push Token operations
  async savePushToken(tokenData: InsertPushToken): Promise<PushToken> {
    // Check if token already exists for this user/device
    const [existing] = await db
      .select()
      .from(pushTokens)
      .where(
        and(
          eq(pushTokens.userId, tokenData.userId || "default"),
          eq(pushTokens.token, tokenData.token)
        )
      );

    if (existing) {
      // Update existing token
      const [updated] = await db
        .update(pushTokens)
        .set({ ...tokenData, updatedAt: new Date() })
        .where(eq(pushTokens.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new token
      const [created] = await db
        .insert(pushTokens)
        .values({ ...tokenData, userId: tokenData.userId || "default" })
        .returning();
      return created;
    }
  }

  async getAllPushTokens(userId = "default"): Promise<PushToken[]> {
    return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  }

  async deletePushToken(token: string): Promise<boolean> {
    const result = await db.delete(pushTokens).where(eq(pushTokens.token, token));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
