import { Router } from "express";
import crypto from "crypto";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError, ValidationError } from "../middleware/error-handler";
import { storage } from "../storage";
import { employeeCreateSchema, idParamSchema } from "../utils/validation";

export const employeeRoutes = Router();

// GET /api/employees
employeeRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { status, role, search, page, limit } = req.query;
    const employees = await storage.getAllEmployees({
      status: status as string,
      role: role as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(employees);
  })
);

// GET /api/employees/template/download
employeeRoutes.get(
  "/template/download",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    res.json({ message: "Template download endpoint - implement Excel template generation" });
  })
);

// POST /api/employees
employeeRoutes.post(
  "/",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const data = employeeCreateSchema.parse(req.body);
    const employee = await storage.createEmployee({
      ...data,
      qrToken: crypto.randomBytes(16).toString("hex"),
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "CREATE",
      entityType: "Employee",
      entityId: employee.id,
      newValues: data,
    });

    res.status(201).json(employee);
  })
);

// GET /api/employees/:id
employeeRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const employee = await storage.getEmployee(id);
    if (!employee) throw new NotFoundError("Employee");
    res.json(employee);
  })
);

// PATCH /api/employees/:id
employeeRoutes.patch(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const existing = await storage.getEmployee(id);
    if (!existing) throw new NotFoundError("Employee");

    const updated = await storage.updateEmployee(id, req.body);

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "UPDATE",
      entityType: "Employee",
      entityId: id,
      oldValues: existing,
      newValues: req.body,
    });

    res.json(updated);
  })
);

// DELETE /api/employees/:id (soft delete)
employeeRoutes.delete(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await storage.deleteEmployee(id);

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "DELETE",
      entityType: "Employee",
      entityId: id,
    });

    res.json({ message: "Employee deleted" });
  })
);

// GET /api/employees/:id/complete-file (201 file)
employeeRoutes.get(
  "/:id/complete-file",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const file = await storage.getEmployeeCompleteFile(id);
    if (!file) throw new NotFoundError("Employee");
    res.json(file);
  })
);

// GET /api/employees/:id/qr-code
employeeRoutes.get(
  "/:id/qr-code",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const employee = await storage.getEmployee(id);
    if (!employee) throw new NotFoundError("Employee");

    if (!employee.qrToken) {
      const token = crypto.randomBytes(16).toString("hex");
      await storage.updateEmployee(id, { qrToken: token });
      return res.json({ qrToken: token, employeeNo: employee.employeeNo });
    }

    res.json({ qrToken: employee.qrToken, employeeNo: employee.employeeNo });
  })
);

// POST /api/employees/:id/documents
employeeRoutes.post(
  "/:id/documents",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const employee = await storage.getEmployee(id);
    if (!employee) throw new NotFoundError("Employee");

    const doc = await storage.createDocument({
      employeeId: id,
      ...req.body,
    });
    res.status(201).json(doc);
  })
);

// DELETE /api/employees/:id/documents/:docId
employeeRoutes.delete(
  "/:id/documents/:docId",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const docId = Number(req.params.docId);
    await storage.deleteDocument(docId);
    res.json({ message: "Document deleted" });
  })
);

// POST /api/employees/bulk-upload
employeeRoutes.post(
  "/bulk-upload",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (_req, res) => {
    res.json({ message: "Bulk upload endpoint - implement Excel parsing" });
  })
);
