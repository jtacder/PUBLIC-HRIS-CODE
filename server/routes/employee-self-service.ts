import { Router } from "express";
import { isAuthenticated } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";

export const employeeSelfServiceRoutes = Router();

// GET /api/self-service/profile
employeeSelfServiceRoutes.get(
  "/profile",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || !user.employeeId) {
      return res.json({ message: "No employee profile linked" });
    }
    const employee = await storage.getEmployee(user.employeeId);
    if (!employee) throw new NotFoundError("Employee profile");
    res.json(employee);
  })
);

// GET /api/self-service/attendance
employeeSelfServiceRoutes.get(
  "/attendance",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || !user.employeeId) {
      return res.json([]);
    }
    const logs = await storage.getAttendanceLogs({
      employeeId: user.employeeId,
    });
    res.json(logs);
  })
);

// GET /api/self-service/payslips
employeeSelfServiceRoutes.get(
  "/payslips",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || !user.employeeId) {
      return res.json([]);
    }
    const records = await storage.getPayrollRecords();
    const myRecords = records.filter(
      (r: any) => r.employeeId === user.employeeId
    );
    res.json(myRecords);
  })
);

// GET /api/self-service/leave-requests
employeeSelfServiceRoutes.get(
  "/leave-requests",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || !user.employeeId) {
      return res.json([]);
    }
    const requests = await storage.getLeaveRequests({
      employeeId: user.employeeId,
    });
    res.json(requests);
  })
);

// GET /api/self-service/cash-advances
employeeSelfServiceRoutes.get(
  "/cash-advances",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || !user.employeeId) {
      return res.json([]);
    }
    const advances = await storage.getCashAdvances({
      employeeId: user.employeeId,
    });
    res.json(advances);
  })
);

// GET /api/self-service/disciplinary
employeeSelfServiceRoutes.get(
  "/disciplinary",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user || !user.employeeId) {
      return res.json([]);
    }
    const records = await storage.getDisciplinaryRecords({
      employeeId: user.employeeId,
    });
    res.json(records);
  })
);
