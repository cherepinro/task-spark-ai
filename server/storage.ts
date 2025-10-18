import {
  type Task,
  type InsertTask,
  type Project,
  type InsertProject,
  type AIInsight,
  type InsertAIInsight,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Task operations
  getAllTasks(): Promise<Task[]>;
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

export class MemStorage implements IStorage {
  private tasks: Map<string, Task>;
  private projects: Map<string, Project>;
  private insights: Map<string, AIInsight>;

  constructor() {
    this.tasks = new Map();
    this.projects = new Map();
    this.insights = new Map();

    this.seedInitialData();
  }

  private seedInitialData() {
    const welcomeTask: Task = {
      id: randomUUID(),
      title: "Welcome to TaskSpark AI!",
      description: "Explore the AI-powered task management features and get started with your productivity journey.",
      priority: "high",
      status: "todo",
      dueDate: new Date(),
      projectId: null,
      isAISuggested: true,
      aiCategory: "Getting Started",
      completedAt: null,
      createdAt: new Date(),
    };
    this.tasks.set(welcomeTask.id, welcomeTask);

    const sampleInsight: AIInsight = {
      id: randomUUID(),
      type: "productivity",
      title: "Great start!",
      description: "You're off to a great start with TaskSpark AI. AI will analyze your tasks and provide personalized insights to boost your productivity.",
      data: null,
      createdAt: new Date(),
    };
    this.insights.set(sampleInsight.id, sampleInsight);
  }

  // Task operations
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      dueDate: insertTask.dueDate || null,
      projectId: insertTask.projectId || null,
      completedAt: null,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask: Task = {
      ...task,
      ...updates,
      completedAt:
        updates.status === "completed" && task.status !== "completed"
          ? new Date()
          : updates.status !== "completed"
          ? null
          : task.completedAt,
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Project operations
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      color: insertProject.color || "purple",
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // AI Insight operations
  async getAllInsights(): Promise<AIInsight[]> {
    return Array.from(this.insights.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createInsight(insertInsight: InsertAIInsight): Promise<AIInsight> {
    const id = randomUUID();
    const insight: AIInsight = {
      ...insertInsight,
      id,
      data: insertInsight.data || null,
      createdAt: new Date(),
    };
    this.insights.set(id, insight);
    return insight;
  }
}

export const storage = new MemStorage();
