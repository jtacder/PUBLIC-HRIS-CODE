import type { Express } from "express";
import { dashboardRoutes } from "./dashboard";
import { employeeRoutes } from "./employees";
import { projectRoutes } from "./projects";
import { taskRoutes } from "./tasks";
import { attendanceRoutes } from "./attendance";
import { payrollRoutes } from "./payroll";
import { payrollPeriodRoutes } from "./payroll-periods";
import { payslipRoutes } from "./payslips";
import { disciplinaryRoutes } from "./disciplinary";
import { leaveRequestRoutes } from "./leave-requests";
import { cashAdvanceRoutes } from "./cash-advances";
import { hrSettingsRoutes } from "./hr-settings";
import { employeeSelfServiceRoutes } from "./employee-self-service";
import { expenseRoutes } from "./expenses";
import { documentRoutes } from "./documents";

export function registerRoutes(app: Express) {
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/employees", employeeRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/payroll/periods", payrollPeriodRoutes);
  app.use("/api/payslips", payslipRoutes);
  app.use("/api/disciplinary", disciplinaryRoutes);
  app.use("/api/leave-requests", leaveRequestRoutes);
  app.use("/api/leave-types", hrSettingsRoutes);
  app.use("/api/cash-advances", cashAdvanceRoutes);
  app.use("/api/hr-settings", hrSettingsRoutes);
  app.use("/api/self-service", employeeSelfServiceRoutes);
  app.use("/api/expenses", expenseRoutes);
  app.use("/api/documents", documentRoutes);
}
