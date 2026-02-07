import { Router } from "express";
import { isAuthenticated } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { taskCreateSchema, idParamSchema } from "../utils/validation";

export const taskRoutes = Router();

// GET /api/tasks
taskRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { status, priority, projectId, assignedTo } = req.query;
    const tasks = await storage.getAllTasks({
      status: status as string,
      priority: priority as string,
      projectId: projectId ? Number(projectId) : undefined,
      assignedTo: assignedTo ? Number(assignedTo) : undefined,
    });
    res.json(tasks);
  })
);

// POST /api/tasks
taskRoutes.post(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const data = taskCreateSchema.parse(req.body);
    const task = await storage.createTask({
      ...data,
      createdBy: req.session.userId,
    });
    res.status(201).json(task);
  })
);

// GET /api/tasks/:id
taskRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const task = await storage.getTask(id);
    if (!task) throw new NotFoundError("Task");
    res.json(task);
  })
);

// PATCH /api/tasks/:id
taskRoutes.patch(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const existing = await storage.getTask(id);
    if (!existing) throw new NotFoundError("Task");

    const updateData: any = { ...req.body };
    if (req.body.status === "Done" && existing.status !== "Done") {
      updateData.completedAt = new Date();
    }

    const updated = await storage.updateTask(id, updateData);
    res.json(updated);
  })
);

// DELETE /api/tasks/:id
taskRoutes.delete(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    await storage.deleteTask(id);
    res.json({ message: "Task deleted" });
  })
);

// POST /api/tasks/:id/comments
taskRoutes.post(
  "/:id/comments",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const comment = await storage.createTaskComment({
      taskId: id,
      userId: req.session.userId!,
      content: req.body.content,
    });
    res.status(201).json(comment);
  })
);

// GET /api/tasks/:id/comments
taskRoutes.get(
  "/:id/comments",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const comments = await storage.getTaskComments(id);
    res.json(comments);
  })
);
