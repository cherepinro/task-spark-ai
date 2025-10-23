import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requiresAIAccess } from "./auth";
import type { AuthenticatedRequest } from "./types";
import {
  insertTaskSchema,
  updateTaskSchema,
  insertProjectSchema,
  insertTaskTemplateSchema,
  insertUserSettingsSchema,
  insertPushTokenSchema,
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
  parseMarkdownChecklist,
  generateDayPlan,
  reorganizeTasks,
  type ChatMessage,
  type TimeBlock,
  type ReorganizeSuggestion,
} from "./services/ai.service";
// Legacy quota service replaced by usage-tracker.service
import { checkUsage, incrementUsage, getAllUsage, type FeatureType } from "./services/usage-tracker.service";
import { cacheService } from "./services/cache.service";
import { dataCacheService } from "./services/data-cache.service";
import { logger } from "./services/logger.service";
import md5 from "md5";
import { calculateNextOccurrence, shouldCreateNextOccurrence } from "./utils/recurrence";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      logger.apiError('GET /api/auth/user', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch('/api/auth/user', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { pushNotificationsEnabled } = req.body;

      if (typeof pushNotificationsEnabled !== 'boolean') {
        return res.status(400).json({ message: "pushNotificationsEnabled must be a boolean" });
      }

      const updatedUser = await storage.updateUser(userId, { pushNotificationsEnabled });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      logger.apiError('PATCH /api/auth/user', error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      logger.apiError('GET /api/admin/users', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }
      
      const { isAdmin, hasAIAccess } = req.body;
      const user = await storage.updateUserRole(req.params.id, isAdmin, hasAIAccess);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      logger.info('User role updated', { userId: user.id, isAdmin, hasAIAccess });
      res.json(user);
    } catch (error) {
      logger.apiError('PATCH /api/admin/users/:id', error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch('/api/user/push-notifications', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { enabled } = req.body;
      
      const user = await storage.updateUserPushNotifications(userId, enabled);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      logger.info('Push notifications updated', { userId, enabled });
      res.json(user);
    } catch (error) {
      logger.apiError('PATCH /api/user/push-notifications', error);
      res.status(500).json({ message: "Failed to update push notification settings" });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
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

  app.get("/api/tasks/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
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

  app.post("/api/tasks", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check task limit
      const taskUsage = await checkUsage('tasks');
      if (!taskUsage.allowed) {
        return res.status(429).json({ 
          error: `Task limit reached. You have created ${taskUsage.limit} tasks (maximum allowed). Please delete some tasks to create new ones.`,
          remaining: taskUsage.remaining,
          limit: taskUsage.limit,
        });
      }

      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      
      // Invalidate tasks cache
      dataCacheService.invalidateTasks();
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.apiError('POST /api/tasks - Validation error', error);
        return res.status(400).json({ error: error.errors });
      }
      logger.apiError('POST /api/tasks', error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.post("/api/tasks/bulk-import", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check usage limit
      const usageCheck = await checkUsage('bulk_import');
      if (!usageCheck.allowed) {
        return res.status(429).json({ 
          error: `Bulk import limit reached. You can import ${usageCheck.limit} checklists per month. Resets next month.`,
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        });
      }

      const { checklist, priority = "medium", projectId } = req.body;
      
      if (!checklist || typeof checklist !== "string") {
        return res.status(400).json({ error: "Checklist text is required" });
      }

      // Parse the markdown checklist
      const parsedTasks = parseMarkdownChecklist(checklist);
      
      if (parsedTasks.length === 0) {
        return res.status(400).json({ error: "No valid tasks found in checklist" });
      }

      // Check if importing would exceed task limit
      const taskUsage = await checkUsage('tasks');
      if (taskUsage.used + parsedTasks.length > taskUsage.limit) {
        return res.status(429).json({
          error: `Task limit would be exceeded. You have ${taskUsage.remaining} tasks remaining out of ${taskUsage.limit} total.`,
          remaining: taskUsage.remaining,
          limit: taskUsage.limit,
        });
      }

      // Create all tasks
      const createdTasks = await Promise.all(
        parsedTasks.map(async (item) => {
          return await storage.createTask({
            title: item.title,
            priority: priority as "low" | "medium" | "high",
            status: "todo",
            hours: item.hours.toString(),
            projectId: projectId || undefined,
          });
        })
      );

      // Increment usage counter
      await incrementUsage('bulk_import');

      // Invalidate tasks cache
      dataCacheService.invalidateTasks();

      res.status(201).json({
        count: createdTasks.length,
        tasks: createdTasks,
        usage: {
          remaining: usageCheck.remaining - 1,
          limit: usageCheck.limit,
        },
      });
    } catch (error) {
      logger.apiError('POST /api/tasks/bulk-import', error);
      res.status(500).json({ error: "Failed to import tasks" });
    }
  });

  // IMPORTANT: /api/tasks/bulk must come BEFORE /api/tasks/:id 
  // Otherwise Express matches "bulk" as an ID parameter
  app.patch("/api/tasks/bulk", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: "Updates must be an array" });
      }

      // Validate each update
      const validatedUpdates = updates.map((update: any) => {
        if (!update.id) {
          throw new Error("Each update must have an id");
        }
        logger.debug("Bulk update - before parse", { id: update.id, updates: update.updates });
        const parsed = updateTaskSchema.parse(update.updates);
        logger.debug("Bulk update - after parse", { id: update.id, parsed });
        return {
          id: update.id,
          updates: parsed,
        };
      });

      // Apply all updates
      const updatedTasks = await Promise.all(
        validatedUpdates.map(async ({ id, updates }) => {
          return await storage.updateTask(id, updates);
        })
      );

      // Filter out any null results (task not found)
      const successfulUpdates = updatedTasks.filter(task => task !== null);

      // Invalidate tasks cache
      dataCacheService.invalidateTasks();

      res.json({
        count: successfulUpdates.length,
        tasks: successfulUpdates,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.apiError('PATCH /api/tasks/bulk', error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update tasks" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Handle recurring task: create next occurrence if task is completed
      logger.debug("Recurrence check:", {
        id: task.id,
        title: task.title,
        isRecurring: task.isRecurring,
        recurrencePattern: task.recurrencePattern,
        status: task.status,
        shouldCreate: shouldCreateNextOccurrence(task)
      });
      
      if (shouldCreateNextOccurrence(task)) {
        const nextDate = calculateNextOccurrence(task);
        logger.debug("Next recurrence date", { nextDate });
        
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
          logger.debug("Creating next recurrence task", { nextTask });
          const createdTask = await storage.createTask(nextTask);
          logger.debug("Created recurrence task", { taskId: createdTask.id });
        }
      }

      // Invalidate tasks cache
      dataCacheService.invalidateTasks();
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.apiError('PATCH /api/tasks/:id', error as Error, { taskId: req.params.id, body: req.body });
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
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
  app.get("/api/projects", isAuthenticated, async (_req: Request, res: Response) => {
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

  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check project limit
      const projectUsage = await checkUsage('projects');
      if (!projectUsage.allowed) {
        return res.status(429).json({ 
          error: `Project limit reached. You have created ${projectUsage.limit} projects (maximum allowed). Please delete some projects to create new ones.`,
          remaining: projectUsage.remaining,
          limit: projectUsage.limit,
        });
      }

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

  app.patch("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updates);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Invalidate projects cache
      dataCacheService.invalidateProjects();
      
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/ai/suggest", isAuthenticated, requiresAIAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const suggestion = await analyzeTask(taskData);
      res.json(suggestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.apiError('POST /api/ai/suggest', error);
      res.status(500).json({ error: "Failed to generate AI suggestion" });
    }
  });

  // AI Parse natural language endpoint
  app.post("/api/ai/parse", isAuthenticated, requiresAIAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { input } = req.body;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ error: "Input text is required" });
      }
      const parsedTask = await parseNaturalLanguageTask(input);
      res.json(parsedTask);
    } catch (error) {
      logger.apiError('POST /api/ai/parse', error);
      res.status(500).json({ error: "Failed to parse input" });
    }
  });

  // Generate productivity insight
  app.post("/api/ai/generate-insight", isAuthenticated, requiresAIAccess, async (req: AuthenticatedRequest, res: Response) => {
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
      logger.apiError('POST /api/ai/generate-insight', error);
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", isAuthenticated, requiresAIAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, conversationHistory } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const userId = req.user!.id;
      const usageCheck = await checkUsage('ai_chat', userId);
      
      if (!usageCheck.allowed) {
        return res.status(429).json({ 
          error: `AI chat limit reached. You have used ${usageCheck.limit} messages this month.`,
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        });
      }

      const history: ChatMessage[] = conversationHistory || [];
      const tasks = await storage.getAllTasks();
      
      const response = await chatWithAI(message, history, tasks);
      
      // Increment usage
      await incrementUsage('ai_chat', userId);
      
      res.json(response);
    } catch (error) {
      logger.apiError('POST /api/ai/chat', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // AI Task Decomposition endpoint
  app.post("/api/ai/decompose", isAuthenticated, requiresAIAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title } = req.body;
      
      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Task title is required" });
      }

      // Get authenticated user ID
      const userId = req.user!.id;
      const usageCheck = await checkUsage('ai_decompose', userId);
      
      if (!usageCheck.allowed) {
        return res.status(429).json({ 
          error: `AI decompose limit reached. You have used ${usageCheck.limit} of ${usageCheck.limit} this month.`,
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        });
      }

      // Check cache
      const cacheKey = md5(title.toLowerCase().trim());
      const cached = cacheService.get<any>(cacheKey);
      
      if (cached) {
        return res.json({
          ...cached,
          fromCache: true,
          remainingQuota: usageCheck.remaining - 1,
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

      // Increment usage counter
      await incrementUsage('ai_decompose', userId);

      // Prepare response
      const response = {
        tasks: savedTasks.map((task) => ({
          id: task.id,
          title: task.title,
          hours: parseFloat(task.hours || "0"),
        })),
        tokensUsed: result.tokensUsed,
        remainingQuota: usageCheck.remaining - 1,
      };

      // Cache the result
      cacheService.set(cacheKey, response);

      // Invalidate tasks cache since we created new tasks
      dataCacheService.invalidateTasks();

      res.json(response);
    } catch (error) {
      logger.apiError('POST /api/ai/decompose', error);
      res.status(500).json({ error: "Failed to decompose task" });
    }
  });

  // AI Day Plan endpoint
  app.post("/api/ai/day-plan", isAuthenticated, requiresAIAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Check usage limit
      const usageCheck = await checkUsage('day_plan', userId);
      if (!usageCheck.allowed) {
        return res.status(429).json({ 
          error: `Day planner limit reached. You can generate ${usageCheck.limit} plan per day. Resets tomorrow.`,
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        });
      }

      const { tasks, habits, busySlots } = req.body;
      
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: "Tasks array is required" });
      }

      // Fetch full task details from database
      const allTasks = await storage.getAllTasks();
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      
      const validTasks = tasks
        .map((taskId: string) => taskMap.get(taskId))
        .filter((t): t is Task => t !== undefined);

      // Generate day plan with AI
      const timeBlocks = await generateDayPlan({
        tasks: validTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          priority: t.priority,
          hours: t.hours || undefined,
        })),
        habits: habits || [],
        busySlots: busySlots || [],
      });

      // Increment usage counter
      await incrementUsage('day_plan', userId);

      res.json({
        timeBlocks,
        usage: {
          remaining: usageCheck.remaining - 1,
          limit: usageCheck.limit,
        },
      });
    } catch (error) {
      logger.apiError('POST /api/ai/day-plan', error);
      res.status(500).json({ error: "Failed to generate day plan" });
    }
  });

  // AI Reorganize (Eisenhower Matrix) endpoint
  app.post("/api/ai/reorganize", isAuthenticated, requiresAIAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Check usage limit (once per day)
      const usageCheck = await checkUsage('ai_reorganize', userId);
      if (!usageCheck.allowed) {
        return res.status(429).json({ 
          error: `Reorganize limit reached. You can reorganize ${usageCheck.limit} time per day. Resets tomorrow.`,
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        });
      }

      const { taskIds } = req.body;
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ error: "taskIds array is required and must not be empty" });
      }

      // Fetch all tasks
      const allTasks = await storage.getAllTasks();
      const taskMap = new Map(allTasks.map(t => [t.id, t]));
      
      const selectedTasks = taskIds
        .map((taskId: string) => taskMap.get(taskId))
        .filter((t): t is Task => t !== undefined);

      if (selectedTasks.length === 0) {
        return res.status(400).json({ error: "No valid tasks found" });
      }

      // Calculate 7-day completion ratio
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentTasks = allTasks.filter(t => {
        const createdAt = new Date(t.createdAt);
        return createdAt >= sevenDaysAgo;
      });
      
      const completedRecent = recentTasks.filter(t => t.status === 'completed').length;
      const completedRatio7d = recentTasks.length > 0 ? completedRecent / recentTasks.length : 0.5;

      // Get AI reorganization suggestions
      const suggestions = await reorganizeTasks({
        tasks: selectedTasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || undefined,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
        })),
        completedRatio7d,
      });

      // Increment usage counter
      await incrementUsage('ai_reorganize', userId);

      res.json({
        suggestions,
        completedRatio7d: Math.round(completedRatio7d * 100) / 100,
        usage: {
          remaining: usageCheck.remaining - 1,
          limit: usageCheck.limit,
        },
      });
    } catch (error) {
      logger.apiError('POST /api/ai/reorganize', error);
      res.status(500).json({ error: "Failed to reorganize tasks" });
    }
  });

  // Push Notification routes
  app.post("/api/push/token", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPushTokenSchema.parse(req.body);
      const token = await storage.savePushToken(validatedData);
      
      logger.info('Push token saved', { platform: token.platform, tokenId: token.id });
      
      res.status(201).json({ 
        success: true, 
        message: 'Push token registered successfully',
        tokenId: token.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.apiError('POST /api/push/token', error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  app.delete("/api/push/token", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Token is required" });
      }

      const success = await storage.deletePushToken(token);
      
      if (!success) {
        return res.status(404).json({ error: "Token not found" });
      }

      logger.info('Push token deleted', { token: token.substring(0, 20) + '...' });
      
      res.json({ success: true, message: 'Push token deleted successfully' });
    } catch (error) {
      logger.apiError('DELETE /api/push/token', error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });

  // Procrastination Score ML endpoint
  app.get("/api/ml/procrastination-score", async (_req: Request, res: Response) => {
    try {
      // Check cache first (1 hour TTL)
      const cacheKey = 'ml:procrastination-score';
      const cached = cacheService.get<{ score: number; level: string; confidence: number; calculatedAt: string }>(cacheKey);
      
      if (cached) {
        logger.cacheHit(cacheKey);
        return res.json({ ...cached, fromCache: true });
      }

      // Fetch all tasks for feature calculation
      const allTasks = await storage.getAllTasks();
      const stats = await storage.getUserStats();
      
      // Calculate 10 features for ML model
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Feature 1: tasks_overdue_ratio (0-1)
      const overdueTasks = allTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed' && t.status !== 'archived'
      );
      const activeTasks = allTasks.filter(t => t.status !== 'completed' && t.status !== 'archived');
      const tasksOverdueRatio = activeTasks.length > 0 ? overdueTasks.length / activeTasks.length : 0;
      
      // Feature 2: avg_task_completion_time (0-10 days)
      const completedTasks = allTasks.filter(t => t.status === 'completed');
      let avgCompletionTime = 5; // default
      if (completedTasks.length > 0) {
        const completionTimes = completedTasks.map(t => {
          const created = new Date(t.createdAt);
          const completed = t.completedAt ? new Date(t.completedAt) : now;
          return (completed.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
        });
        avgCompletionTime = Math.min(10, completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length);
      }
      
      // Feature 3: tasks_with_high_priority_incomplete (0-1)
      const highPriorityIncomplete = activeTasks.filter(t => t.priority === 'high');
      const highPriorityRatio = activeTasks.length > 0 ? highPriorityIncomplete.length / activeTasks.length : 0;
      
      // Feature 4: days_since_last_completion (0-30)
      let daysSinceLastCompletion = 30; // default (max)
      if (completedTasks.length > 0) {
        const sortedCompleted = completedTasks.sort((a, b) => {
          const aDate = a.completedAt ? new Date(a.completedAt) : new Date(a.createdAt);
          const bDate = b.completedAt ? new Date(b.completedAt) : new Date(b.createdAt);
          return bDate.getTime() - aDate.getTime();
        });
        const lastCompleted = sortedCompleted[0].completedAt 
          ? new Date(sortedCompleted[0].completedAt)
          : new Date(sortedCompleted[0].createdAt);
        daysSinceLastCompletion = Math.min(30, (now.getTime() - lastCompleted.getTime()) / (24 * 60 * 60 * 1000));
      }
      
      // Feature 5: task_creation_to_due_ratio (0-1)
      const tasksWithDueDates = allTasks.filter(t => t.dueDate);
      let creationToDueRatio = 0.5; // default
      if (tasksWithDueDates.length > 0) {
        const ratios = tasksWithDueDates.map(t => {
          const created = new Date(t.createdAt);
          const due = new Date(t.dueDate!);
          const totalTime = due.getTime() - created.getTime();
          const timeToDue = totalTime / (7 * 24 * 60 * 60 * 1000); // weeks until due
          return Math.min(1, Math.max(0, 1 - (timeToDue / 4))); // High ratio = created close to due
        });
        creationToDueRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      }
      
      // Feature 6: avg_task_age (0-30 days)
      let avgTaskAge = 15; // default
      if (activeTasks.length > 0) {
        const ages = activeTasks.map(t => {
          const created = new Date(t.createdAt);
          return Math.min(30, (now.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
        });
        avgTaskAge = ages.reduce((a, b) => a + b, 0) / ages.length;
      }
      
      // Feature 7: completion_rate_last_week (0-1)
      const recentTasks = allTasks.filter(t => new Date(t.createdAt) >= oneWeekAgo);
      const recentCompleted = recentTasks.filter(t => t.status === 'completed');
      const completionRateLastWeek = recentTasks.length > 0 ? recentCompleted.length / recentTasks.length : 0.5;
      
      // Feature 8: tasks_in_progress_ratio (0-1)
      const inProgressTasks = allTasks.filter(t => t.status === 'in-progress');
      const inProgressRatio = allTasks.length > 0 ? inProgressTasks.length / allTasks.length : 0;
      
      // Feature 9: project_switching_frequency (0-1)
      // Simplified: ratio of tasks across multiple projects vs single project
      const projectIds = new Set(allTasks.filter(t => t.projectId).map(t => t.projectId));
      const projectSwitchingFrequency = projectIds.size > 1 ? Math.min(1, (projectIds.size - 1) / 5) : 0;
      
      // Feature 10: ai_suggestions_ignored_ratio (0-1)
      // Use stats data if available, otherwise default to 0.3
      const aiSuggestionsIgnoredRatio = 0.3; // Placeholder - would need tracking in actual app
      
      // Construct feature vector
      const features = [
        tasksOverdueRatio,
        avgCompletionTime,
        highPriorityRatio,
        daysSinceLastCompletion,
        creationToDueRatio,
        avgTaskAge,
        completionRateLastWeek,
        inProgressRatio,
        projectSwitchingFrequency,
        aiSuggestionsIgnoredRatio
      ];
      
      logger.mlFeatures(features);
      
      // Call ML service
      const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      
      try {
        const mlResponse = await fetch(`${ML_SERVICE_URL}/features`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features }),
        });
        
        if (!mlResponse.ok) {
          throw new Error(`ML service returned ${mlResponse.status}`);
        }
        
        const mlResult = await mlResponse.json();
        
        const result = {
          score: mlResult.score,
          level: mlResult.level,
          confidence: mlResult.confidence,
          calculatedAt: now.toISOString(),
        };
        
        // Cache for 1 hour
        cacheService.set(cacheKey, result, 60 * 60);
        logger.mlPrediction(result.score, result.level, result.confidence);
        
        res.json({ ...result, fromCache: false });
      } catch (mlError) {
        logger.mlServiceError(mlError);
        // Return fallback score based on simple heuristics
        const fallbackScore = Math.round(tasksOverdueRatio * 50 + (1 - completionRateLastWeek) * 50);
        const fallbackLevel = fallbackScore <= 30 ? 'low' : fallbackScore <= 60 ? 'moderate' : 'high';
        
        res.json({
          score: fallbackScore,
          level: fallbackLevel,
          confidence: 0.5,
          calculatedAt: now.toISOString(),
          fromCache: false,
          fallback: true,
          error: 'ML service unavailable'
        });
      }
    } catch (error) {
      logger.apiError('GET /api/ml/procrastination-score', error);
      res.status(500).json({ error: "Failed to calculate procrastination score" });
    }
  });

  // Task Template routes
  app.get("/api/templates", isAuthenticated, async (_req: Request, res: Response) => {
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

  app.get("/api/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
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

  app.post("/api/templates", isAuthenticated, async (req: Request, res: Response) => {
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

  app.patch("/api/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
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

  app.delete("/api/templates/:id", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/templates/:id/create-task", isAuthenticated, async (req: Request, res: Response) => {
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

  // Usage tracking endpoint
  app.get("/api/usage", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const usage = await getAllUsage();
      res.json(usage);
    } catch (error) {
      logger.apiError('GET /api/usage', error);
      res.status(500).json({ error: "Failed to fetch usage data" });
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

  // User settings routes
  app.get("/api/settings", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        const defaultSettings = await storage.updateUserSettings({
          focusSprintEnabled: false,
          focusSprintSound: "soft-chime",
        }, userId);
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      logger.apiError('GET /api/settings', error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const validatedSettings = insertUserSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateUserSettings(validatedSettings, userId);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      logger.apiError('PATCH /api/settings', error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // User stats routes
  app.get("/api/stats", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.getUserStats(userId);
      
      if (!stats) {
        const defaultStats = await storage.incrementSprintCount(userId);
        return res.json({ ...defaultStats, sprintsCompleted: 0 });
      }
      
      res.json(stats);
    } catch (error) {
      logger.apiError('GET /api/stats', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.post("/api/stats/sprint-complete", isAuthenticated, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const stats = await storage.incrementSprintCount(userId);
      res.json(stats);
    } catch (error) {
      logger.apiError('POST /api/stats/sprint-complete', error);
      res.status(500).json({ error: "Failed to increment sprint count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
