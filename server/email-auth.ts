import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool } from "./db";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { config, env } from "./config";
import { logger } from "./utils/logger";
import { UnauthorizedError, ForbiddenError } from "./middleware/error-handler";

const PgSession = connectPgSimple(session);

// Extend express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
    isSuperadmin: boolean;
    csrfToken: string;
  }
}

// Extend Express Request
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      role: string;
      isSuperadmin: boolean;
      employeeId: number | null;
    }
  }
}

/**
 * Setup session-based authentication
 */
export function setupAuth(app: Express) {
  const sessionStore = new PgSession({
    pool: pool as any,
    tableName: "session",
    createTableIfMissing: true,
    pruneSessionInterval: 60 * 15, // 15 minutes
  });

  app.use(
    session({
      store: sessionStore,
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      name: "hris.sid",
      cookie: {
        secure: env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: config.session.ttl,
      },
    })
  );

  // CSRF token endpoint
  app.get("/api/auth/csrf-token", (req, res) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString("hex");
    }
    res.json({ csrfToken: req.session.csrfToken });
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()));

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account is deactivated" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Regenerate session for security
      req.session.regenerate((err) => {
        if (err) {
          logger.error("Session regeneration failed", { error: err.message });
          return res.status(500).json({ error: "Login failed" });
        }

        req.session.userId = user.id;
        req.session.role = user.role;
        req.session.isSuperadmin = user.isSuperadmin;
        req.session.csrfToken = crypto.randomBytes(32).toString("hex");

        // Update last login
        db.update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id))
          .execute()
          .catch((e) => logger.error("Failed to update last login", { error: e.message }));

        const { passwordHash: _, ...safeUser } = user;
        return res.json({
          user: safeUser,
          csrfToken: req.session.csrfToken,
        });
      });
    } catch (error: any) {
      logger.error("Login error", { error: error.message });
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("hris.sid");
      return res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { passwordHash: _, ...safeUser } = user;
    return res.json(safeUser);
  });

  // Change password
  app.post("/api/auth/change-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.userId!;

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

      return res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      logger.error("Change password error", { error: error.message });
      return res.status(500).json({ error: "Failed to change password" });
    }
  });
}

/**
 * Middleware: Check if user is authenticated
 */
export function isAuthenticated(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId) {
    throw new UnauthorizedError("Authentication required");
  }
  next();
}

/**
 * Middleware: Check if user has required role
 */
export function hasRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      throw new UnauthorizedError("Authentication required");
    }
    if (req.session.isSuperadmin) {
      return next(); // Superadmin bypasses all role checks
    }
    if (!roles.includes(req.session.role!)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    next();
  };
}

/**
 * Middleware: CSRF protection for state-changing requests
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const token = req.headers["x-csrf-token"] as string;
  if (!token || token !== req.session.csrfToken) {
    throw new ForbiddenError("Invalid CSRF token");
  }
  next();
}
