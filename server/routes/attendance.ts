import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, ValidationError, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { clockInSchema, clockOutSchema, idParamSchema } from "../utils/validation";
import { isWithinGeofence } from "../utils/geo";
import { detectShiftType, calculateLateMinutes, getTodayPH, minutesBetween } from "../utils/datetime";
import { config } from "../config";

export const attendanceRoutes = Router();

// GET /api/attendance/today
attendanceRoutes.get(
  "/today",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    const records = await storage.getTodayAttendance();
    res.json(records);
  })
);

// POST /api/attendance/clock-in
attendanceRoutes.post(
  "/clock-in",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const data = clockInSchema.parse(req.body);

    // 1. Find employee by QR token
    const employee = await storage.getEmployeeByQrToken(data.qrToken);
    if (!employee) {
      throw new ValidationError("Invalid QR code");
    }

    // 2. Check for duplicate clock-in
    const activeClockIn = await storage.getActiveClockIn(employee.id);
    if (activeClockIn) {
      throw new ValidationError("Already clocked in. Please clock out first.");
    }

    // 3. Check active project assignments
    const assignments = await storage.getEmployeeAssignments(employee.id);
    const activeAssignments = assignments.filter((a: any) => a.isActive);
    if (activeAssignments.length === 0) {
      throw new ValidationError("No active project assignment found");
    }

    // 4. Geofence verification
    let matchedProjectId: number | null = null;
    let verificationStatus: "Verified" | "Off-site" = "Off-site";

    for (const assignment of activeAssignments) {
      const project = await storage.getProject(assignment.projectId);
      if (
        project &&
        project.locationLat &&
        project.locationLng &&
        project.geoRadius
      ) {
        const within = isWithinGeofence(
          data.gpsLatitude,
          data.gpsLongitude,
          Number(project.locationLat),
          Number(project.locationLng),
          project.geoRadius
        );
        if (within) {
          matchedProjectId = project.id;
          verificationStatus = "Verified";
          break;
        }
      } else {
        // Project without geofence - accept
        matchedProjectId = assignment.projectId;
        verificationStatus = "Verified";
        break;
      }
    }

    if (!matchedProjectId) {
      throw new ValidationError(
        "You are outside all assigned project geofences"
      );
    }

    // 5. Detect shift type
    const now = new Date();
    const clockInHour = now.getUTCHours() + 8; // PH offset
    const shiftType = detectShiftType(clockInHour % 24);

    // 6. Calculate tardiness
    const { lateMinutes, isDeductible } = calculateLateMinutes(
      now,
      employee.shiftStartTime || "08:00",
      config.payroll.defaultGraceMinutes
    );

    // 7. Create attendance log
    const log = await storage.createAttendanceLog({
      employeeId: employee.id,
      projectId: matchedProjectId,
      timeIn: now,
      gpsLatitude: String(data.gpsLatitude),
      gpsLongitude: String(data.gpsLongitude),
      gpsAccuracy: data.gpsAccuracy ? String(data.gpsAccuracy) : null,
      photoSnapshotUrl: data.photoSnapshot || null,
      verificationStatus,
      lateMinutes,
      lateDeductible: isDeductible,
      scheduledShiftDate: getTodayPH(),
      actualShiftType: shiftType,
    });

    res.status(201).json(log);
  })
);

// POST /api/attendance/clock-out
attendanceRoutes.post(
  "/clock-out",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const data = clockOutSchema.parse(req.body);
    const log = await storage.getAttendanceLog(data.attendanceId);
    if (!log) throw new NotFoundError("Attendance record");

    const timeOut = new Date();
    const totalMinutes = minutesBetween(new Date(log.timeIn), timeOut);
    const lunchDeduction = totalMinutes >= 300 ? 60 : 0; // 5+ hours = 60min lunch
    const workingMinutes = Math.max(0, totalMinutes - lunchDeduction);

    // Detect overtime (> 8 hours = 480 minutes)
    const overtimeMinutes = Math.max(0, workingMinutes - 480);

    const updated = await storage.updateAttendanceLog(data.attendanceId, {
      timeOut,
      totalWorkingMinutes: workingMinutes,
      lunchDeductionMinutes: lunchDeduction,
      overtimeMinutes,
      otStatus: overtimeMinutes > 0 ? "Pending" : "None",
    });

    res.json(updated);
  })
);

// PATCH /api/attendance/:id
attendanceRoutes.patch(
  "/:id",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateAttendanceLog(id, req.body);
    res.json(updated);
  })
);

// POST /api/attendance/bulk-upload
attendanceRoutes.post(
  "/bulk-upload",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (_req, res) => {
    res.json({ message: "Bulk attendance upload - implement Excel parsing" });
  })
);

// GET /api/attendance/template/download
attendanceRoutes.get(
  "/template/download",
  isAuthenticated,
  asyncHandler(async (_req, res) => {
    res.json({ message: "Attendance template download endpoint" });
  })
);

// POST /api/attendance/:id/justification
attendanceRoutes.post(
  "/:id/justification",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updateAttendanceLog(id, {
      justification: req.body.justification,
    });
    res.json(updated);
  })
);
