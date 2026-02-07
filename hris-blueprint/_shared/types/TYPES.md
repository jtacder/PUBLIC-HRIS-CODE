# Shared TypeScript Types

## Overview

All TypeScript types in the HRIS system are derived from the Drizzle ORM schema defined in `shared/schema.ts`. The schema uses `drizzle-zod` to generate both Zod validation schemas and TypeScript types from the database table definitions. This ensures the database schema, API validation, and TypeScript types are always in sync.

**Type Generation Pattern:**
```
PostgreSQL Tables  -->  Drizzle ORM Schema  -->  drizzle-zod  -->  TypeScript Types + Zod Schemas
(complete-schema.sql)   (shared/schema.ts)       (createInsertSchema)  (Select types + Insert types)
```

---

## Core Entity Types

### User / Authentication Types

```typescript
// Select type (reading from database)
interface User {
  id: string;                              // UUID
  email: string;
  passwordHash: string;
  role: "ADMIN" | "HR" | "ENGINEER" | "WORKER";
  isSuperadmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;              // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

// Insert type (writing to database)
interface InsertUser {
  email: string;
  passwordHash: string;
  role?: "ADMIN" | "HR" | "ENGINEER" | "WORKER";  // defaults to "WORKER"
  isSuperadmin?: boolean;                          // defaults to false
  isActive?: boolean;                              // defaults to true
}
```

### Role / Permission Types

```typescript
interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  module: string;              // e.g., "employees", "attendance", "payroll"
  action: string;              // e.g., "create", "read", "update", "delete", "export"
  description: string | null;
  createdAt: string;
}

interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  granted: boolean;
  expiresAt: string | null;
  createdAt: string;
}
```

---

### Employee Types

```typescript
// Select type -- full employee record with 50+ fields
interface Employee {
  id: string;                              // UUID
  employeeNo: string;                      // e.g., "EMP-2024-001"
  firstName: string;
  lastName: string;
  middleName: string | null;
  suffix: string | null;                   // e.g., "Jr.", "III"
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  birthDate: string | null;               // ISO date
  gender: string | null;
  civilStatus: string | null;
  nationality: string | null;             // defaults to "Filipino"
  bloodType: string | null;
  religion: string | null;

  // Emergency contact
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;

  // Employment details
  position: string | null;
  department: string | null;
  hireDate: string | null;               // ISO date
  regularizationDate: string | null;
  separationDate: string | null;
  status: EmployeeStatus;
  role: EmployeeRole;

  // Government IDs (Philippine)
  sssNo: string | null;
  philhealthNo: string | null;
  pagibigNo: string | null;
  tinNo: string | null;

  // Compensation
  dailyRate: number;                      // defaults to 0
  monthlyRate: number;                    // defaults to 0
  rateType: "daily" | "monthly";         // defaults to "daily"
  overtimeRateMultiplier: number;         // defaults to 1.25

  // Banking
  bankName: string | null;
  bankAccountNo: string | null;

  // Shift configuration
  shiftStartTime: string | null;         // e.g., "08:00"
  shiftEndTime: string | null;           // e.g., "17:00"
  shiftWorkDays: string | null;          // e.g., "Mon,Tue,Wed,Thu,Fri"

  // QR / Biometrics
  qrToken: string | null;               // 32-char hex string
  faceDescriptor: string | null;         // JSON string of face embedding

  // Media
  photoUrl: string | null;

  // Linked user account
  userId: string | null;

  // Soft delete
  isDeleted: boolean;
  deletedAt: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Insert type -- fields required for creating a new employee
interface InsertEmployee {
  employeeNo: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  suffix?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  zipCode?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  nationality?: string | null;
  bloodType?: string | null;
  religion?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  position?: string | null;
  department?: string | null;
  hireDate?: string | null;
  regularizationDate?: string | null;
  status?: EmployeeStatus;
  role?: EmployeeRole;
  sssNo?: string | null;
  philhealthNo?: string | null;
  pagibigNo?: string | null;
  tinNo?: string | null;
  dailyRate?: number;
  monthlyRate?: number;
  rateType?: "daily" | "monthly";
  overtimeRateMultiplier?: number;
  bankName?: string | null;
  bankAccountNo?: string | null;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  shiftWorkDays?: string | null;
  photoUrl?: string | null;
  userId?: string | null;
}
```

---

### Project Types

```typescript
interface Project {
  id: string;
  name: string;
  code: string | null;                    // e.g., "PROJ-2024-001"
  description: string | null;
  isOffice: boolean;                      // true for permanent office locations
  locationLat: number | null;             // GPS latitude for geofence center
  locationLng: number | null;             // GPS longitude for geofence center
  geoRadius: number;                      // Geofence radius in meters (default: 100)
  address: string | null;
  startDate: string | null;
  deadline: string | null;
  actualEndDate: string | null;
  budget: number | null;
  actualCost: number;
  status: ProjectStatus;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InsertProject {
  name: string;
  code?: string | null;
  description?: string | null;
  isOffice?: boolean;
  locationLat?: number | null;
  locationLng?: number | null;
  geoRadius?: number;
  address?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  budget?: number | null;
  status?: ProjectStatus;
  managerId?: string | null;
}

interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  roleInProject: string | null;
  assignedDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}
```

---

### Task Types

```typescript
interface Task {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  assignedToId: string | null;
  createdById: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  completionPhotoUrl: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  createdAt: string;
  updatedAt: string;
}

interface InsertTask {
  title: string;
  description?: string | null;
  projectId?: string | null;
  assignedToId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  sortOrder?: number;
  estimatedHours?: number | null;
}

interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
}
```

---

### Attendance Types

```typescript
interface AttendanceLog {
  id: string;
  employeeId: string;
  projectId: string | null;
  timeIn: string | null;                  // ISO timestamp
  timeOut: string | null;

  // GPS verification
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsAccuracy: number | null;             // Accuracy in meters
  gpsLatitudeOut: number | null;
  gpsLongitudeOut: number | null;

  // Photo verification
  photoSnapshotUrl: string | null;        // Time-in selfie
  photoSnapshotUrlOut: string | null;     // Time-out selfie

  // Verification
  verificationStatus: AttendanceVerification;
  faceVerified: boolean;

  // Lateness
  lateMinutes: number;
  lateDeductible: boolean;               // Whether late minutes trigger payroll deduction

  // Overtime
  overtimeMinutes: number;
  otStatus: OTStatus;
  isOvertimeSession: boolean;

  // Shift info
  scheduledShiftDate: string | null;      // ISO date
  actualShiftType: "day" | "night";

  // Working time computation
  lunchDeductionMinutes: number;
  totalWorkingMinutes: number;

  // Notes
  justification: string | null;          // Employee justification for late/OT
  adminNotes: string | null;

  createdAt: string;
  updatedAt: string;
}

interface InsertAttendanceLog {
  employeeId: string;
  projectId?: string | null;
  timeIn?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsAccuracy?: number | null;
  photoSnapshotUrl?: string | null;
  scheduledShiftDate?: string | null;
  actualShiftType?: "day" | "night";
}
```

---

### Payroll Types

```typescript
interface PayrollPeriod {
  id: string;
  name: string;                           // e.g., "Jan 1-15, 2026"
  startDate: string;
  endDate: string;
  payDate: string | null;
  type: "semi_monthly" | "monthly";
  status: "Open" | "Processing" | "Closed";
  createdAt: string;
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  payrollPeriodId: string;

  // Earnings
  basicPay: number;
  overtimePay: number;
  holidayPay: number;
  allowances: number;
  grossPay: number;

  // Government deductions (Philippine)
  sssDeduction: number;
  philhealthDeduction: number;
  pagibigDeduction: number;
  withholdingTax: number;

  // Other deductions
  cashAdvanceDeduction: number;
  lateDeduction: number;
  unpaidLeaveDeduction: number;
  otherDeductions: number;

  // Totals
  totalDeductions: number;
  netPay: number;

  // Work metrics
  daysWorked: number;
  hoursOvertime: number;
  daysAbsent: number;
  daysLate: number;

  // Workflow
  status: PayrollStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  releasedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

interface InsertPayrollRecord {
  employeeId: string;
  payrollPeriodId: string;
  basicPay?: number;
  overtimePay?: number;
  holidayPay?: number;
  allowances?: number;
  grossPay?: number;
  sssDeduction?: number;
  philhealthDeduction?: number;
  pagibigDeduction?: number;
  withholdingTax?: number;
  cashAdvanceDeduction?: number;
  lateDeduction?: number;
  unpaidLeaveDeduction?: number;
  otherDeductions?: number;
  totalDeductions?: number;
  netPay?: number;
  daysWorked?: number;
  hoursOvertime?: number;
  daysAbsent?: number;
  daysLate?: number;
  status?: PayrollStatus;
}

interface Payslip {
  id: string;
  payrollRecordId: string;
  employeeId: string;
  payrollPeriodId: string;
  pdfUrl: string | null;
  generatedAt: string | null;
  emailedAt: string | null;
  viewedAt: string | null;
  createdAt: string;
}
```

---

### Leave Types

```typescript
interface LeaveType {
  id: string;
  name: string;                           // e.g., "Sick Leave", "Vacation Leave"
  daysPerYear: number;
  isPaid: boolean;
  accrualMode: "annual" | "monthly" | "none";
  requiresProof: boolean;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  supportingDocUrl: string | null;
  status: LeaveStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InsertLeaveRequest {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason?: string | null;
  supportingDocUrl?: string | null;
}

interface LeaveAllocation {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  createdAt: string;
  updatedAt: string;
}
```

---

### Cash Advance / Loan Types

```typescript
interface CashAdvance {
  id: string;
  employeeId: string;
  amount: number;
  purpose: string | null;
  deductionPerCutoff: number;
  remainingBalance: number;
  totalInstallments: number | null;
  status: CashAdvanceStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  disbursedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InsertCashAdvance {
  employeeId: string;
  amount: number;
  purpose?: string | null;
  deductionPerCutoff: number;
  totalInstallments?: number | null;
}

interface CashAdvanceDeduction {
  id: string;
  cashAdvanceId: string;
  payrollRecordId: string | null;
  amount: number;
  deductionDate: string;
  notes: string | null;
  createdAt: string;
}
```

---

### Disciplinary Types

```typescript
interface DisciplinaryRecord {
  id: string;
  employeeId: string;
  violation: string;
  description: string | null;
  dateIssued: string;
  deadline: string | null;
  status: DisciplinaryStatus;
  issuedBy: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InsertDisciplinaryRecord {
  employeeId: string;
  violation: string;
  description?: string | null;
  dateIssued?: string;
  deadline?: string | null;
  issuedBy?: string | null;
}

interface DisciplinaryExplanation {
  id: string;
  disciplinaryId: string;
  content: string;
  attachmentUrl: string | null;
  submittedAt: string;
  createdAt: string;
}

interface DisciplinarySanction {
  id: string;
  disciplinaryId: string;
  type: "verbal_warning" | "written_warning" | "suspension" | "termination";
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}
```

---

### Expense Types

```typescript
interface Expense {
  id: string;
  requesterId: string;
  projectId: string | null;
  amount: number;
  category: string;                        // e.g., "Materials", "Transportation", "Food"
  description: string | null;
  receiptUrl: string | null;
  status: "Pending" | "Approved" | "Rejected" | "Reimbursed";
  approvedBy: string | null;
  approvedAt: string | null;
  reimbursedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InsertExpense {
  requesterId: string;
  projectId?: string | null;
  amount: number;
  category: string;
  description?: string | null;
  receiptUrl?: string | null;
}
```

---

### Devotional Types

```typescript
interface Devotional {
  id: string;
  title: string;
  content: string;
  scriptureReference: string | null;
  date: string;
  author: string | null;
  isPublished: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InsertDevotional {
  title: string;
  content: string;
  scriptureReference?: string | null;
  date: string;
  author?: string | null;
  isPublished?: boolean;
}
```

---

### Audit Log Types

```typescript
interface AuditLog {
  id: string;
  userId: string | null;
  action: "CREATE" | "READ" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "RELEASE" | "LOGIN" | "LOGOUT";
  entityType: string;                      // e.g., "Employee", "PayrollRecord", "LeaveRequest"
  entityId: string | null;
  oldValues: Record<string, unknown> | null;  // JSONB snapshot before
  newValues: Record<string, unknown> | null;  // JSONB snapshot after
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface InsertAuditLog {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}
```

---

### System Configuration Types

```typescript
interface CompanySetting {
  id: string;
  key: string;                             // e.g., "company_name", "grace_period_minutes"
  value: string | null;
  dataType: "string" | "number" | "boolean" | "json";
  category: string | null;                 // e.g., "general", "attendance", "payroll"
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

interface Holiday {
  id: string;
  name: string;                            // e.g., "New Year's Day"
  date: string;                            // ISO date
  type: "regular" | "special";            // Regular = 200% pay, Special = 130% pay
  year: number;
  isRecurring: boolean;
  createdAt: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error" | "approval";
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
```

---

### Schedule Types

```typescript
interface ScheduleTemplate {
  id: string;
  name: string;                            // e.g., "Day Shift", "Night Shift"
  shiftStart: string;                      // e.g., "08:00"
  shiftEnd: string;                        // e.g., "17:00"
  workDays: string;                        // e.g., "Mon,Tue,Wed,Thu,Fri"
  breakMinutes: number;                    // defaults to 60
  isNightShift: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeSchedule {
  id: string;
  employeeId: string;
  templateId: string | null;
  effectiveDate: string;
  endDate: string | null;
  shiftStart: string;
  shiftEnd: string;
  workDays: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## Enum Types

All enum types are enforced at the database level with `CHECK` constraints and at the application level with Zod schemas.

```typescript
// Employee status lifecycle
type EmployeeStatus = "Active" | "Probationary" | "Terminated" | "Suspended" | "Resigned" | "AWOL";

// System roles for role-based access control
type EmployeeRole = "ADMIN" | "HR" | "ENGINEER" | "WORKER";

// Payroll processing workflow
type PayrollStatus = "DRAFT" | "APPROVED" | "RELEASED";

// Leave request lifecycle
type LeaveStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

// Attendance GPS verification state
type AttendanceVerification = "Verified" | "Off-site" | "Pending" | "Flagged";

// Cash advance / loan lifecycle
type CashAdvanceStatus = "Pending" | "Approved" | "Disbursed" | "Rejected" | "Fully_Paid";

// Disciplinary record lifecycle
type DisciplinaryStatus = "Issued" | "Explanation_Received" | "Under_Review" | "Resolved";

// Project lifecycle
type ProjectStatus = "Planning" | "Active" | "On_Hold" | "Completed" | "Cancelled";

// Kanban task states
type TaskStatus = "Todo" | "In_Progress" | "Blocked" | "Done";

// Task urgency levels
type TaskPriority = "Low" | "Medium" | "High" | "Critical";

// Overtime approval workflow
type OTStatus = "Pending" | "Approved" | "Rejected";

// Expense claim lifecycle
type ExpenseStatus = "Pending" | "Approved" | "Rejected" | "Reimbursed";

// Holiday pay multiplier types
type HolidayType = "regular" | "special";

// Audit log action verbs
type AuditAction = "CREATE" | "READ" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "RELEASE" | "LOGIN" | "LOGOUT";

// Notification categories
type NotificationType = "info" | "warning" | "success" | "error" | "approval";

// Disciplinary sanction severity levels
type SanctionType = "verbal_warning" | "written_warning" | "suspension" | "termination";

// Rate computation basis
type RateType = "daily" | "monthly";

// Leave accrual modes
type AccrualMode = "annual" | "monthly" | "none";

// Payroll period frequency
type PayrollPeriodType = "semi_monthly" | "monthly";

// Payroll period processing state
type PayrollPeriodStatus = "Open" | "Processing" | "Closed";

// Shift type for attendance
type ShiftType = "day" | "night";
```

---

## Type Generation from Drizzle ORM

The types above are generated from the Drizzle schema using this pattern:

```typescript
// shared/schema.ts
import { pgTable, uuid, varchar, boolean, decimal, timestamp, text, date, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the table
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeNo: varchar("employee_no", { length: 50 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  // ... 50+ more columns
  status: varchar("status", { length: 30 }).notNull().default("Active"),
  role: varchar("role", { length: 50 }).notNull().default("WORKER"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Generate Zod insert schema (auto-excludes id, createdAt, updatedAt)
export const insertEmployeeSchema = createInsertSchema(employees);

// Derive TypeScript types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
```

### Using Types in API Routes

```typescript
import { Employee, InsertEmployee, employees } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Type-safe database query
const employee: Employee = await db.query.employees.findFirst({
  where: eq(employees.id, id),
});

// Type-safe insert
const newEmployee: InsertEmployee = {
  employeeNo: "EMP-2026-001",
  firstName: "Juan",
  lastName: "Dela Cruz",
  status: "Active",
  role: "WORKER",
};
await db.insert(employees).values(newEmployee);
```

### Using Types in React Components

```typescript
import type { Employee, LeaveRequest, PayrollRecord } from "@shared/schema";

function EmployeeCard({ employee }: { employee: Employee }) {
  return (
    <Card>
      <CardTitle>{employee.firstName} {employee.lastName}</CardTitle>
      <Badge>{employee.status}</Badge>
    </Card>
  );
}
```

---

## Type Relationships (Entity Diagram)

```
User (1) ----< (N) Employee (via userId)
Employee (1) ----< (N) AttendanceLog
Employee (1) ----< (N) PayrollRecord
Employee (1) ----< (N) LeaveRequest
Employee (1) ----< (N) CashAdvance
Employee (1) ----< (N) DisciplinaryRecord
Employee (1) ----< (N) Expense
Employee (1) ----< (N) EmployeeDocument
Employee (1) ----< (N) ProjectAssignment
Employee (1) ----< (N) Task (assignedToId)
Employee (1) ----< (N) EmployeeSchedule
Employee (1) ----< (N) LeaveAllocation

Project (1) ----< (N) ProjectAssignment
Project (1) ----< (N) Task
Project (1) ----< (N) AttendanceLog
Project (1) ----< (N) Expense

PayrollPeriod (1) ----< (N) PayrollRecord
PayrollRecord (1) ----< (N) Payslip
PayrollRecord (1) ----< (N) CashAdvanceDeduction

LeaveType (1) ----< (N) LeaveRequest
LeaveType (1) ----< (N) LeaveAllocation

Task (1) ----< (N) TaskComment

DisciplinaryRecord (1) ----< (N) DisciplinaryExplanation
DisciplinaryRecord (1) ----< (N) DisciplinarySanction

CashAdvance (1) ----< (N) CashAdvanceDeduction
```
