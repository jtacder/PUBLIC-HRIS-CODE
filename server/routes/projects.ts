import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { projectCreateSchema, idParamSchema } from "../utils/validation";

export const projectRoutes = Router();

// GET /api/projects
projectRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const projects = await storage.getAllProjects();
    res.json(projects);
  })
);

// POST /api/projects
projectRoutes.post(
  "/",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const data = projectCreateSchema.parse(req.body);
    const project = await storage.createProject(data);

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "CREATE",
      entityType: "Project",
      entityId: project.id,
      newValues: data,
    });

    res.status(201).json(project);
  })
);

// GET /api/projects/:id
projectRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const project = await storage.getProject(id);
    if (!project) throw new NotFoundError("Project");
    res.json(project);
  })
);

// PATCH /api/projects/:id
projectRoutes.patch(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const existing = await storage.getProject(id);
    if (!existing) throw new NotFoundError("Project");

    const updated = await storage.updateProject(id, req.body);

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "UPDATE",
      entityType: "Project",
      entityId: id,
      oldValues: existing,
      newValues: req.body,
    });

    res.json(updated);
  })
);

// DELETE /api/projects/:id
projectRoutes.delete(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await storage.deleteProject(id);

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "DELETE",
      entityType: "Project",
      entityId: id,
    });

    res.json({ message: "Project deleted" });
  })
);

// GET /api/projects/:id/assignments
projectRoutes.get(
  "/:id/assignments",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const assignments = await storage.getProjectAssignments(id);
    res.json(assignments);
  })
);

// POST /api/projects/:id/assignments
projectRoutes.post(
  "/:id/assignments",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const assignment = await storage.createAssignment({
      projectId: id,
      ...req.body,
    });
    res.status(201).json(assignment);
  })
);

// PATCH /api/projects/:id/assignments/:empId
projectRoutes.patch(
  "/:id/assignments/:empId",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const assignmentId = Number(req.params.empId);
    const updated = await storage.updateAssignment(assignmentId, req.body);
    res.json(updated);
  })
);
