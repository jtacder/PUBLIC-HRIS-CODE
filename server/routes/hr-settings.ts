import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler } from "../middleware/error-handler";
import { storage } from "../storage";
import { idParamSchema } from "../utils/validation";

export const hrSettingsRoutes = Router();

// GET /api/hr-settings
hrSettingsRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const settings = await storage.getSettings();
    const leaveTypes = await storage.getLeaveTypes();
    const holidays = await storage.getHolidays();
    res.json({ settings, leaveTypes, holidays });
  })
);

// POST /api/hr-settings/payroll-cutoffs
hrSettingsRoutes.post(
  "/payroll-cutoffs",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const period = await storage.createPayrollPeriod(req.body);
    res.status(201).json(period);
  })
);

// GET /api/hr-settings/payroll-cutoffs
hrSettingsRoutes.get(
  "/payroll-cutoffs",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const periods = await storage.getPayrollPeriods();
    res.json(periods);
  })
);

// PATCH /api/hr-settings/payroll-cutoffs/:id
hrSettingsRoutes.patch(
  "/payroll-cutoffs/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updatePayrollPeriod(id, req.body);
    res.json(updated);
  })
);

// DELETE /api/hr-settings/payroll-cutoffs/:id
hrSettingsRoutes.delete(
  "/payroll-cutoffs/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    // Soft delete via status
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updatePayrollPeriod(id, { status: "Closed" });
    res.json(updated);
  })
);

// POST /api/hr-settings/leave-types
hrSettingsRoutes.post(
  "/leave-types",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const leaveType = await storage.createLeaveType(req.body);
    res.status(201).json(leaveType);
  })
);

// GET /api/hr-settings/leave-types (also serves /api/leave-types)
hrSettingsRoutes.get(
  "/leave-types",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const types = await storage.getLeaveTypes();
    res.json(types);
  })
);

// PATCH /api/hr-settings/leave-types/:id
hrSettingsRoutes.patch(
  "/leave-types/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateLeaveType(id, req.body);
    res.json(updated);
  })
);

// POST /api/hr-settings/holidays
hrSettingsRoutes.post(
  "/holidays",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const holiday = await storage.createHoliday(req.body);
    res.status(201).json(holiday);
  })
);

// GET /api/hr-settings/holidays
hrSettingsRoutes.get(
  "/holidays",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const holidays = await storage.getHolidays(year);
    res.json(holidays);
  })
);

// PATCH /api/hr-settings/company-info
hrSettingsRoutes.patch(
  "/company-info",
  isAuthenticated,
  hasRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await storage.setSetting(key, value as string);
    }
    res.json({ message: "Company info updated" });
  })
);
