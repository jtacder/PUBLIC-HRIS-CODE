import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { idParamSchema } from "../utils/validation";

export const disciplinaryRoutes = Router();

// GET /api/disciplinary
disciplinaryRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { employeeId, status } = req.query;
    const records = await storage.getDisciplinaryRecords({
      employeeId: employeeId ? Number(employeeId) : undefined,
      status: status as string,
    });
    res.json(records);
  })
);

// POST /api/disciplinary
disciplinaryRoutes.post(
  "/",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const today = new Date();
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + 5); // 5-day response deadline

    const record = await storage.createDisciplinaryRecord({
      ...req.body,
      issuedBy: req.session.userId,
      dateIssued: today.toISOString().split("T")[0],
      deadline: deadline.toISOString().split("T")[0],
      status: "Issued",
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "CREATE",
      entityType: "Disciplinary",
      entityId: record.id,
      newValues: req.body,
    });

    res.status(201).json(record);
  })
);

// GET /api/disciplinary/:id
disciplinaryRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const record = await storage.getDisciplinaryRecord(id);
    if (!record) throw new NotFoundError("Disciplinary record");
    res.json(record);
  })
);

// PATCH /api/disciplinary/:id
disciplinaryRoutes.patch(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateDisciplinaryRecord(id, req.body);
    res.json(updated);
  })
);

// POST /api/disciplinary/:id/explanation
disciplinaryRoutes.post(
  "/:id/explanation",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const record = await storage.getDisciplinaryRecord(id);
    if (!record) throw new NotFoundError("Disciplinary record");

    const explanation = await storage.createExplanation({
      disciplinaryId: id,
      employeeId: req.body.employeeId,
      explanation: req.body.explanation,
    });

    await storage.updateDisciplinaryRecord(id, {
      status: "Explanation_Received",
    });

    res.status(201).json(explanation);
  })
);

// PATCH /api/disciplinary/:id/resolve
disciplinaryRoutes.patch(
  "/:id/resolve",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);

    const updated = await storage.updateDisciplinaryRecord(id, {
      status: "Resolved",
      resolution: req.body.resolution,
      resolvedBy: req.session.userId,
      resolvedAt: new Date(),
    });

    if (req.body.sanction) {
      await storage.createSanction({
        disciplinaryId: id,
        ...req.body.sanction,
        issuedBy: req.session.userId,
      });
    }

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "UPDATE",
      entityType: "Disciplinary",
      entityId: id,
      newValues: { status: "Resolved", resolution: req.body.resolution },
    });

    res.json(updated);
  })
);
