import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { idParamSchema } from "../utils/validation";

export const documentRoutes = Router();

// GET /api/documents/employee/:employeeId
documentRoutes.get(
  "/employee/:employeeId",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const employeeId = Number(req.params.employeeId);
    const docs = await storage.getEmployeeDocuments(employeeId);
    res.json(docs);
  })
);

// POST /api/documents
documentRoutes.post(
  "/",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const doc = await storage.createDocument(req.body);
    res.status(201).json(doc);
  })
);

// DELETE /api/documents/:id
documentRoutes.delete(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await storage.deleteDocument(id);
    res.json({ message: "Document deleted" });
  })
);
