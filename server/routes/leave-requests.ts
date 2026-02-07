import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError, ValidationError } from "../middleware/error-handler";
import { storage } from "../storage";
import { leaveRequestCreateSchema, idParamSchema } from "../utils/validation";

export const leaveRequestRoutes = Router();

// GET /api/leave-requests
leaveRequestRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { employeeId, status } = req.query;
    const requests = await storage.getLeaveRequests({
      employeeId: employeeId ? Number(employeeId) : undefined,
      status: status as string,
    });
    res.json(requests);
  })
);

// POST /api/leave-requests
leaveRequestRoutes.post(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const data = leaveRequestCreateSchema.parse(req.body);
    const request = await storage.createLeaveRequest({
      ...data,
      status: "Pending",
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "CREATE",
      entityType: "Leave",
      entityId: request.id,
      newValues: data,
    });

    res.status(201).json(request);
  })
);

// GET /api/leave-requests/:id
leaveRequestRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const request = await storage.getLeaveRequest(id);
    if (!request) throw new NotFoundError("Leave request");
    res.json(request);
  })
);

// PATCH /api/leave-requests/:id/approve
leaveRequestRoutes.patch(
  "/:id/approve",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const request = await storage.getLeaveRequest(id);
    if (!request) throw new NotFoundError("Leave request");

    const updated = await storage.updateLeaveRequest(id, {
      status: "Approved",
      approvedBy: req.session.userId,
      approvedAt: new Date(),
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "APPROVE",
      entityType: "Leave",
      entityId: id,
    });

    res.json(updated);
  })
);

// PATCH /api/leave-requests/:id/reject
leaveRequestRoutes.patch(
  "/:id/reject",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    if (!req.body.rejectionReason) {
      throw new ValidationError("Rejection reason is required");
    }

    const updated = await storage.updateLeaveRequest(id, {
      status: "Rejected",
      rejectionReason: req.body.rejectionReason,
    });

    res.json(updated);
  })
);

// PATCH /api/leave-requests/:id/cancel
leaveRequestRoutes.patch(
  "/:id/cancel",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const request = await storage.getLeaveRequest(id);
    if (!request) throw new NotFoundError("Leave request");

    if (request.status !== "Pending") {
      throw new ValidationError("Only pending requests can be cancelled");
    }

    const updated = await storage.updateLeaveRequest(id, {
      status: "Cancelled",
    });

    res.json(updated);
  })
);
