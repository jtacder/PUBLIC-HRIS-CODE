import { Router } from "express";
import { isAuthenticated, hasRole } from "../email-auth";
import { asyncHandler, NotFoundError } from "../middleware/error-handler";
import { storage } from "../storage";
import { idParamSchema } from "../utils/validation";
import { computePayroll } from "../payroll-calculator";

export const payrollRoutes = Router();

// GET /api/payroll
payrollRoutes.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const periodId = req.query.periodId ? Number(req.query.periodId) : undefined;
    const records = await storage.getPayrollRecords(periodId);
    res.json(records);
  })
);

// POST /api/payroll/generate
payrollRoutes.post(
  "/generate",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { periodId } = req.body;
    if (!periodId) {
      return res.status(400).json({ error: "periodId is required" });
    }

    const period = await storage.getPayrollPeriods();
    const targetPeriod = period.find((p: any) => p.id === periodId);
    if (!targetPeriod) throw new NotFoundError("Payroll period");

    // Get active employees
    const employees = await storage.getAllEmployees({ status: "Active" });
    const results = [];

    for (const emp of employees) {
      if (!emp.dailyRate && !emp.monthlyRate) continue;

      const dailyRate = emp.rateType === "daily"
        ? Number(emp.dailyRate || 0)
        : Number(emp.monthlyRate || 0) / 22;

      // Get attendance for period
      const attendance = await storage.getAttendanceLogs({
        employeeId: emp.id,
        startDate: targetPeriod.startDate,
        endDate: targetPeriod.endDate,
      });

      const daysWorked = attendance.length;
      const approvedOTMinutes = attendance.reduce((sum: number, a: any) => {
        return sum + (a.otStatus === "Approved" ? (a.overtimeMinutes || 0) : 0);
      }, 0);
      const deductibleLateMinutes = attendance.reduce((sum: number, a: any) => {
        return sum + (a.lateDeductible ? (a.lateMinutes || 0) : 0);
      }, 0);

      // Get cash advance deduction
      const cashAdvances = await storage.getCashAdvances({
        employeeId: emp.id,
        status: "Disbursed",
      });
      const cashAdvanceDeduction = cashAdvances.reduce((sum: number, ca: any) => {
        return sum + Math.min(Number(ca.deductionPerCutoff), Number(ca.remainingBalance));
      }, 0);

      // Compute payroll
      const payrollResult = computePayroll({
        employeeId: emp.id,
        dailyRate,
        rateType: emp.rateType as "daily" | "monthly",
        daysWorked,
        overtimeMinutes: approvedOTMinutes,
        lateMinutesDeductible: deductibleLateMinutes,
        unpaidLeaveDays: 0,
        cashAdvanceDeduction,
      });

      const record = await storage.createPayrollRecord({
        employeeId: emp.id,
        periodId,
        daysWorked: String(daysWorked),
        basicPay: String(payrollResult.basicPay.toFixed(2)),
        overtimePay: String(payrollResult.overtimePay.toFixed(2)),
        grossPay: String(payrollResult.grossPay.toFixed(2)),
        sssDeduction: String(payrollResult.sssDeduction.toFixed(2)),
        philhealthDeduction: String(payrollResult.philhealthDeduction.toFixed(2)),
        pagibigDeduction: String(payrollResult.pagibigDeduction.toFixed(2)),
        withholdingTax: String(payrollResult.withholdingTax.toFixed(2)),
        cashAdvanceDeduction: String(payrollResult.cashAdvanceDeduction.toFixed(2)),
        lateDeduction: String(payrollResult.lateDeduction.toFixed(2)),
        totalDeductions: String(payrollResult.totalDeductions.toFixed(2)),
        netPay: String(payrollResult.netPay.toFixed(2)),
        status: "DRAFT",
      });

      results.push(record);
    }

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "CREATE",
      entityType: "Payroll",
      entityId: periodId,
      newValues: { generatedCount: results.length },
    });

    res.status(201).json({ message: `Generated ${results.length} payroll records`, records: results });
  })
);

// GET /api/payroll/:id
payrollRoutes.get(
  "/:id",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const record = await storage.getPayrollRecord(id);
    if (!record) throw new NotFoundError("Payroll record");
    res.json(record);
  })
);

// PATCH /api/payroll/:id/approve
payrollRoutes.patch(
  "/:id/approve",
  isAuthenticated,
  hasRole("ADMIN", "HR"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updatePayrollRecord(id, {
      status: "APPROVED",
      approvedBy: req.session.userId,
      approvedAt: new Date(),
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "APPROVE",
      entityType: "Payroll",
      entityId: id,
    });

    res.json(updated);
  })
);

// PATCH /api/payroll/:id/release
payrollRoutes.patch(
  "/:id/release",
  isAuthenticated,
  hasRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const updated = await storage.updatePayrollRecord(id, {
      status: "RELEASED",
      releasedBy: req.session.userId,
      releasedAt: new Date(),
    });

    await storage.createAuditLog({
      userId: req.session.userId!,
      action: "RELEASE",
      entityType: "Payroll",
      entityId: id,
    });

    res.json(updated);
  })
);

// GET /api/payroll/:id/summary
payrollRoutes.get(
  "/:id/summary",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const record = await storage.getPayrollRecord(id);
    if (!record) throw new NotFoundError("Payroll record");
    res.json(record);
  })
);
