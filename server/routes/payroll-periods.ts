import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { idParamSchema } from "../utils/validation";

export const payrollPeriodRoutes = Router();

// GET /api/payroll/periods
payrollPeriodRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const periods = await storage.getPayrollPeriods();
    res.json(periods);
  })
);

// POST /api/payroll/periods
payrollPeriodRoutes.post(
  "/",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const period = await storage.createPayrollPeriod(req.body);
    res.status(201).json(period);
  })
);

// PATCH /api/payroll/periods/:id
payrollPeriodRoutes.patch(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updatePayrollPeriod(id, req.body);
    res.json(updated);
  })
);
