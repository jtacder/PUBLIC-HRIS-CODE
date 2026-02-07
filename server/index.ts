import express from "express";
import { setupAuth } from "./email-auth";
import { registerRoutes } from "./routes";
import { errorHandler } from "./middleware/error-handler";
import {
  securityHeaders,
  globalRateLimit,
  sanitizeInput,
} from "./middleware/security";
import { setupStaticServing } from "./static";
import { logger } from "./utils/logger";
import { seedSuperadmin } from "./seed-superadmin";

const app = express();

// Security middleware
app.use(securityHeaders);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

// Rate limiting
app.use("/api/", globalRateLimit);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth setup
setupAuth(app);

// API routes
registerRoutes(app);

// Error handler
app.use(errorHandler);

// Static file serving (must be after API routes)
setupStaticServing(app);

const PORT = parseInt(process.env.PORT || "5000", 10);

app.listen(PORT, "0.0.0.0", async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Auto-seed superadmin on startup if needed
  try {
    await seedSuperadmin();
  } catch (e: any) {
    logger.warn("Superadmin seed skipped", { message: e.message });
  }
});
