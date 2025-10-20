import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authService } from "./services/auth.service";
import { logger } from "./services/logger.service";
import { storage } from "./storage";
import { signupSchema, loginSchema } from "@shared/schema";
import type { AuthenticatedRequest } from './types';

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Create admin account if needed
  await authService.createAdminIfNeeded();

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid input",
          errors: validation.error.errors 
        });
      }

      const result = await authService.login(validation.data);
      if (!result.success) {
        return res.status(401).json({ message: result.error });
      }

      // Save user ID in session
      req.session.userId = result.user!.id;
      
      res.json({ 
        message: "Login successful",
        user: {
          id: result.user!.id,
          email: result.user!.email,
          firstName: result.user!.firstName,
          lastName: result.user!.lastName,
          isAdmin: result.user!.isAdmin,
          hasAIAccess: result.user!.hasAIAccess,
        }
      });
    } catch (error) {
      logger.error('Login endpoint error', { error });
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Signup endpoint
  app.post("/api/signup", async (req, res) => {
    try {
      const validation = signupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid input",
          errors: validation.error.errors 
        });
      }

      const result = await authService.signup(validation.data);
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // Automatically log in the new user
      req.session.userId = result.user!.id;
      
      res.json({ 
        message: "Account created successfully",
        user: {
          id: result.user!.id,
          email: result.user!.email,
          firstName: result.user!.firstName,
          lastName: result.user!.lastName,
          isAdmin: result.user!.isAdmin,
          hasAIAccess: result.user!.hasAIAccess,
        }
      });
    } catch (error) {
      logger.error('Signup endpoint error', { error });
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        logger.error('Logout error', { error: err });
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  logger.info("Email/password authentication configured successfully");
}

// Authentication middleware - check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      hasAIAccess: user.hasAIAccess,
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(500).json({ message: "Authentication failed" });
  }
};

// Middleware to check if user has AI access
export const requiresAIAccess: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.hasAIAccess) {
      return res.status(403).json({ 
        message: "AI features are not enabled for your account. Please contact an administrator."
      });
    }

    next();
  } catch (error) {
    logger.error('Error checking AI access', { error });
    res.status(500).json({ message: "Failed to verify AI access" });
  }
};

// Extend session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
