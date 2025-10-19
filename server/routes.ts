import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertTaskSchema,
  updateTaskSchema,
  insertProjectSchema,
  insertTaskTemplateSchema,
  type InsertTask,
  type Task,
} from "@shared/schema";
import { z } from "zod";
import {
  analyzeTask,
  parseNaturalLanguageTask,
  generateProductivityInsight,
  chatWithAI,
  decomposeTask,
  type ChatMessage,
} from "./services/ai.service";
import { checkQuota, incrementQuota } from "./services/quota.service";
import { cacheService } from "./services/cache.service";
import { dataCacheService } from "./services/data-cache.service";
import md5 from "md5";
import { calculateNextOccurrence, shouldCreateNextOccurrence } from "./utils/recurrence";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        priority: req.query.priority as string | undefined,
        status: req.query.status as string | undefined,
        projectId: req.query.projectId as string | undefined,
      };
      
      // Try to get from cache first
      const cached = dataCacheService.getTasks<Task[]>(filters);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Cache miss - fetch from database
      const tasks = await storage.getAllTasks(filters);
      dataCacheService.setTasks(tasks, filters);
      res.setHeader('X-Cache', 'MISS');
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      
      // Invalidate tasks cache
      dataCacheService.invalidateTasks();
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[POST /api/tasks] Validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      console.error("[POST /api/tasks] Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const updates = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Handle recurring task: create next occurrence if task is completed
      console.log("[Recurrence] Checking task:", {
        id: task.id,
        title: task.title,
        isRecurring: task.isRecurring,
        recurrencePattern: task.recurrencePattern,
        status: task.status,
        shouldCreate: shouldCreateNextOccurrence(task)
      });
      
      if (shouldCreateNextOccurrence(task)) {
        const nextDate = calculateNextOccurrence(task);
        console.log("[Recurrence] Next occurrence date:", nextDate);
        
        if (nextDate) {
          const nextTask: InsertTask = {
            title: task.title,
            description: task.description || undefined,
            priority: task.priority as "low" | "medium" | "high",
            status: "todo",
            dueDate: nextDate,
            projectId: task.projectId || undefined,
            isRecurring: task.isRecurring || undefined,
            recurrencePattern: (task.recurrencePattern as "daily" | "weekly" | "monthly" | "yearly") || undefined,
            recurrenceInterval: task.recurrenceInterval || undefined,
            recurrenceEndDate: task.recurrenceEndDate || undefined,
            recurrenceEndCount: task.recurrenceEndCount || undefined,
            parentTaskId: task.id,
            isAISuggested: task.isAISuggested || undefined,
            aiCategory: task.aiCategory || undefined,
          };
          console.log("[Recurrence] Creating next task:", nextTask);
          const createdTask = await storage.createTask(nextTask);
          console.log("[Recurrence] Created task:", createdTask.id);
        }
      }

      // Invalidate tasks cache
      dataCacheService.invalidateTasks();
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Invalidate tasks cache
      dataCacheService.invalidateTasks();
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Project routes
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      // Try cache first
      const cached = dataCacheService.getProjects();
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Cache miss
      const projects = await storage.getAllProjects();
      dataCacheService.setProjects(projects);
      res.setHeader('X-Cache', 'MISS');
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      
      // Invalidate projects cache
      dataCacheService.invalidateProjects();
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Invalidate projects cache
      dataCacheService.invalidateProjects();
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // AI Insights routes
  app.get("/api/insights", async (_req: Request, res: Response) => {
    try {
      // Try cache first
      const cached = dataCacheService.getInsights();
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Cache miss
      const insights = await storage.getAllInsights();
      dataCacheService.setInsights(insights);
      res.setHeader('X-Cache', 'MISS');
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  // AI Suggestion endpoint
  app.post("/api/ai/suggest", async (req: Request, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const suggestion = await analyzeTask(taskData);
      res.json(suggestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to generate AI suggestion" });
    }
  });

  // AI Parse natural language endpoint
  app.post("/api/ai/parse", async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ error: "Input text is required" });
      }
      const parsedTask = await parseNaturalLanguageTask(input);
      res.json(parsedTask);
    } catch (error) {
      res.status(500).json({ error: "Failed to parse input" });
    }
  });

  // Generate productivity insight
  app.post("/api/ai/generate-insight", async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getAllTasks();
      const insight = await generateProductivityInsight(tasks);

      // Store the insight
      await storage.createInsight({
        type: "productivity",
        title: insight.title,
        description: insight.description,
        data: null,
      });

      // Invalidate insights cache
      dataCacheService.invalidateInsights();

      res.json(insight);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const history: ChatMessage[] = conversationHistory || [];
      const tasks = await storage.getAllTasks();
      
      const response = await chatWithAI(message, history, tasks);
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // AI Task Decomposition endpoint
  app.post("/api/ai/decompose", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      
      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Task title is required" });
      }

      // Check quota
      const userId = "default"; // TODO: Replace with actual user ID when auth is implemented
      const quotaCheck = await checkQuota(userId);
      
      if (!quotaCheck.allowed) {
        return res.status(429).json({ 
          error: "Monthly quota exceeded",
          remainingQuota: quotaCheck.remaining,
          callCount: quotaCheck.callCount,
        });
      }

      // Check cache
      const cacheKey = md5(title.toLowerCase().trim());
      const cached = cacheService.get<any>(cacheKey);
      
      if (cached) {
        return res.json({
          ...cached,
          fromCache: true,
          remainingQuota: quotaCheck.remaining - 1,
        });
      }

      // Call OpenAI to decompose task
      const result = await decomposeTask(title);
      
      // Save decomposed tasks to database
      const savedTasks = await Promise.all(
        result.tasks.map(async (task) => {
          return await storage.createTask({
            title: task.title,
            priority: "medium",
            status: "todo",
            hours: task.hours.toString(),
          });
        })
      );

      // Increment quota
      await incrementQuota(userId);

      // Prepare response
      const response = {
        tasks: savedTasks.map((task) => ({
          id: task.id,
          title: task.title,
          hours: parseFloat(task.hours || "0"),
        })),
        tokensUsed: result.tokensUsed,
        remainingQuota: quotaCheck.remaining - 1,
      };

      // Cache the result
      cacheService.set(cacheKey, response);

      // Invalidate tasks cache since we created new tasks
      dataCacheService.invalidateTasks();

      res.json(response);
    } catch (error) {
      console.error("Task decomposition error:", error);
      res.status(500).json({ error: "Failed to decompose task" });
    }
  });

  // Task Template routes
  app.get("/api/templates", async (_req: Request, res: Response) => {
    try {
      // Try cache first
      const cached = dataCacheService.getTemplates();
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Cache miss
      const templates = await storage.getAllTemplates();
      dataCacheService.setTemplates(templates);
      res.setHeader('X-Cache', 'MISS');
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTaskTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validatedData);
      
      // Invalidate templates cache
      dataCacheService.invalidateTemplates();
      
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = insertTaskTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(req.params.id, validatedData);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Invalidate templates cache
      dataCacheService.invalidateTemplates();
      
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const success = await storage.deleteTemplate(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      // Invalidate templates cache
      dataCacheService.invalidateTemplates();
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Create task from template
  app.post("/api/templates/:id/create-task", async (req: Request, res: Response) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Create task from template, optionally overriding some fields
      const overrides = req.body || {};
      const taskData: InsertTask = {
        title: overrides.title || template.title,
        description: overrides.description !== undefined ? overrides.description : template.description,
        priority: overrides.priority || template.priority,
        status: "todo",
        projectId: overrides.projectId !== undefined ? overrides.projectId : template.projectId,
        isRecurring: overrides.isRecurring !== undefined ? overrides.isRecurring : template.isRecurring,
        recurrencePattern: overrides.recurrencePattern !== undefined ? overrides.recurrencePattern : template.recurrencePattern,
        recurrenceInterval: overrides.recurrenceInterval !== undefined ? overrides.recurrenceInterval : template.recurrenceInterval,
        dueDate: overrides.dueDate,
        isAISuggested: false,
      };

      const task = await storage.createTask(taskData);
      
      // Invalidate tasks cache
      dataCacheService.invalidateTasks();
      
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task from template" });
    }
  });

  // Cache statistics endpoint
  app.get("/api/cache/stats", (_req: Request, res: Response) => {
    try {
      const stats = dataCacheService.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cache stats" });
    }
  });

  // Clear all caches endpoint (for debugging/admin)
  app.post("/api/cache/clear", (_req: Request, res: Response) => {
    try {
      dataCacheService.clearAll();
      res.json({ message: "All caches cleared successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear caches" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
