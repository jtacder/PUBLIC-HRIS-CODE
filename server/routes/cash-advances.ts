import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError, ValidationError } from "../middleware/error-handler";
import { storage } from "../storage";
import { cashAdvanceCreateSchema, idParamSchema } from "../utils/validation";

export const cashAdvanceRoutes = Router();

// GET /api/cash-advances
cashAdvanceRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { employeeId, status } = req.query;
    const advances = await storage.getCashAdvances({
      employeeId: employeeId ? Number(employeeId) : undefined,
      status: status as string,
    });
    res.json(advances);
  })
);

// POST /api/cash-advances
cashAdvanceRoutes.post(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const data = cashAdvanceCreateSchema.parse(req.body);

    if (Number(data.deductionPerCutoff) > Number(data.amount)) {
      throw new ValidationError("Deduction per cutoff cannot exceed total amount");
    }

    const advance = await storage.createCashAdvance({
      ...data,
      remainingBalance: data.amount,
      status: "Pending",
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "CREATE",
      entityType: "CashAdvance",
      entityId: advance.id,
      newValues: data,
    });

    res.status(201).json(advance);
  })
);

// PATCH /api/cash-advances/:id/approve
cashAdvanceRoutes.patch(
  "/:id/approve",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateCashAdvance(id, {
      status: "Approved",
      approvedBy: req.session.userId,
      approvedAt: new Date(),
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "APPROVE",
      entityType: "CashAdvance",
      entityId: id,
    });

    res.json(updated);
  })
);

// PATCH /api/cash-advances/:id/disburse
cashAdvanceRoutes.patch(
  "/:id/disburse",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateCashAdvance(id, {
      status: "Disbursed",
      disbursedAt: new Date(),
    });
    res.json(updated);
  })
);

// PATCH /api/cash-advances/:id/reject
cashAdvanceRoutes.patch(
  "/:id/reject",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateCashAdvance(id, {
      status: "Rejected",
      rejectionReason: req.body.rejectionReason,
    });
    res.json(updated);
  })
);
