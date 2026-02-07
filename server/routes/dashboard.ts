import { Router } from "express";
import { isAuthenticated } from "../email-auth";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";

export const dashboardRoutes = Router();

// GET /api/dashboard/statistics
dashboardRoutes.get(
  "/statistics",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const stats = await storage.getDashboardStatistics();
    res.json(stats);
  })
);

// GET /api/dashboard/metrics
dashboardRoutes.get(
  "/metrics",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const stats = await storage.getDashboardStatistics();
    res.json({
      attendanceTrend: [],
      payrollSummary: {},
      ...stats,
    });
  })
);

// GET /api/dashboard/overview
dashboardRoutes.get(
  "/overview",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const stats = await storage.getDashboardStatistics();
    res.json(stats);
  })
);
