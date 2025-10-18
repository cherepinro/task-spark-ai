import {
  type Task,
  type InsertTask,
  type Project,
  type InsertProject,
  type AIInsight,
  type InsertAIInsight,
  tasks,
  projects,
  aiInsights,
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
}

export class DatabaseStorage implements IStorage {
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
}

export const storage = new DatabaseStorage();
