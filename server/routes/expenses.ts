import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { idParamSchema } from "../utils/validation";

export const expenseRoutes = Router();

// GET /api/expenses
expenseRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { status, requesterId } = req.query;
    const expenses = await storage.getExpenses({
      status: status as string,
      requesterId: requesterId ? Number(requesterId) : undefined,
    });
    res.json(expenses);
  })
);

// POST /api/expenses
expenseRoutes.post(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const expense = await storage.createExpense({
      ...req.body,
      status: "Pending",
    });
    res.status(201).json(expense);
  })
);

// GET /api/expenses/:id
expenseRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const expense = await storage.getExpense(id);
    if (!expense) throw new NotFoundError("Expense");
    res.json(expense);
  })
);

// PATCH /api/expenses/:id
expenseRoutes.patch(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateExpense(id, req.body);

    if (req.body.status === "Approved" || req.body.status === "Rejected") {
      await storage.createAuditLog({
        userId: req.session.userId!,
        action: req.body.status === "Approved" ? "APPROVE" : "UPDATE",
        entityType: "Expense",
        entityId: id,
        newValues: req.body,
      });
    }

    res.json(updated);
  })
);
