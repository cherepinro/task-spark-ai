import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertTaskSchema,
  insertProjectSchema,
  type InsertTask,
  type Task,
} from "@shared/schema";
import { z } from "zod";
import {
  analyzeTask,
  parseNaturalLanguageTask,
  generateProductivityInsight,
  chatWithAI,
  type ChatMessage,
} from "./services/ai.service";

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
      const tasks = await storage.getAllTasks(filters);
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
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const updates = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(req.params.id, updates);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
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
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Project routes
  app.get("/api/projects", async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
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
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // AI Insights routes
  app.get("/api/insights", async (_req: Request, res: Response) => {
    try {
      const insights = await storage.getAllInsights();
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

  const httpServer = createServer(app);
  return httpServer;
}
