import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  varchar,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============ AUTHENTICATION ============

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "HR", "ENGINEER", "WORKER"] })
    .notNull()
    .default("WORKER"),
  isSuperadmin: boolean("is_superadmin").notNull().default(false),
  employeeId: integer("employee_id"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  module: text("module").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id")
    .notNull()
    .references(() => permissions.id, { onDelete: "cascade" }),
  granted: boolean("granted").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ EMPLOYEES ============

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    employeeNo: text("employee_no").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    middleName: text("middle_name"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    province: text("province"),
    zipCode: text("zip_code"),
    dateOfBirth: date("date_of_birth"),
    gender: text("gender", { enum: ["Male", "Female", "Other"] }),
    civilStatus: text("civil_status", {
      enum: ["Single", "Married", "Widowed", "Separated", "Divorced"],
    }),
    nationality: text("nationality").default("Filipino"),

    // Employment
    position: text("position").notNull(),
    department: text("department"),
    hireDate: date("hire_date").notNull(),
    regularizationDate: date("regularization_date"),
    separationDate: date("separation_date"),
    status: text("status", {
      enum: ["Active", "Probationary", "Terminated", "Suspended", "Resigned"],
    })
      .notNull()
      .default("Active"),
    role: text("role", { enum: ["ADMIN", "HR", "ENGINEER", "WORKER"] })
      .notNull()
      .default("WORKER"),

    // Government IDs (Philippine)
    sssNo: text("sss_no"),
    philhealthNo: text("philhealth_no"),
    pagibigNo: text("pagibig_no"),
    tinNo: text("tin_no"),

    // Payroll
    rateType: text("rate_type", { enum: ["daily", "monthly"] })
      .notNull()
      .default("daily"),
    dailyRate: numeric("daily_rate", { precision: 10, scale: 2 }),
    monthlyRate: numeric("monthly_rate", { precision: 12, scale: 2 }),

    // Shift
    shiftStartTime: text("shift_start_time").default("08:00"),
    shiftEndTime: text("shift_end_time").default("17:00"),
    shiftWorkDays: text("shift_work_days").default("Mon,Tue,Wed,Thu,Fri"),

    // QR / Attendance token
    qrToken: text("qr_token"),

    // Emergency contact
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    emergencyContactRelation: text("emergency_contact_relation"),

    // Photo
    photoUrl: text("photo_url"),

    // User link
    userId: integer("user_id").references(() => users.id),

    // Soft delete
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_employee_no").on(table.employeeNo),
    index("idx_employee_status").on(table.status),
    index("idx_employee_role").on(table.role),
    index("idx_employee_status_role").on(table.status, table.role),
  ]
);

export const employeeDocuments = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  documentName: text("document_name").notNull(),
  documentUrl: text("document_url"),
  fileData: text("file_data"), // base64 for small docs
  verified: boolean("verified").notNull().default(false),
  verifiedBy: integer("verified_by"),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const employeeGovernmentIds = pgTable("employee_government_ids", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  idType: text("id_type").notNull(), // SSS, PhilHealth, PagIBIG, TIN, etc.
  idNumber: text("id_number").notNull(),
  issuedDate: date("issued_date"),
  expiryDate: date("expiry_date"),
  documentUrl: text("document_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ PROJECTS ============

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  isOffice: boolean("is_office").notNull().default(false),
  address: text("address"),
  locationLat: numeric("location_lat", { precision: 10, scale: 7 }),
  locationLng: numeric("location_lng", { precision: 10, scale: 7 }),
  geoRadius: integer("geo_radius").default(100), // meters
  status: text("status", {
    enum: ["Planning", "Active", "On Hold", "Completed", "Cancelled"],
  })
    .notNull()
    .default("Planning"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  clientName: text("client_name"),
  budget: numeric("budget", { precision: 14, scale: 2 }),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  role: text("role").default("Member"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ TASKS ============

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["Todo", "In_Progress", "Blocked", "Done"],
  })
    .notNull()
    .default("Todo"),
  priority: text("priority", {
    enum: ["Low", "Medium", "High", "Critical"],
  })
    .notNull()
    .default("Medium"),
  projectId: integer("project_id").references(() => projects.id),
  assignedTo: integer("assigned_to").references(() => employees.id),
  createdBy: integer("created_by").references(() => users.id),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ ATTENDANCE ============

export const attendanceLogs = pgTable(
  "attendance_logs",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    projectId: integer("project_id").references(() => projects.id),
    timeIn: timestamp("time_in").notNull(),
    timeOut: timestamp("time_out"),
    gpsLatitude: numeric("gps_latitude", { precision: 10, scale: 7 }),
    gpsLongitude: numeric("gps_longitude", { precision: 10, scale: 7 }),
    gpsAccuracy: numeric("gps_accuracy", { precision: 10, scale: 2 }),
    photoSnapshotUrl: text("photo_snapshot_url"), // base64 JPEG
    verificationStatus: text("verification_status", {
      enum: ["Verified", "Off-site", "Pending", "Flagged"],
    })
      .notNull()
      .default("Pending"),
    lateMinutes: integer("late_minutes").default(0),
    lateDeductible: boolean("late_deductible").default(false),
    overtimeMinutes: integer("overtime_minutes").default(0),
    otStatus: text("ot_status", {
      enum: ["None", "Pending", "Approved", "Rejected"],
    }).default("None"),
    isOvertimeSession: boolean("is_overtime_session").default(false),
    scheduledShiftDate: date("scheduled_shift_date"),
    actualShiftType: text("actual_shift_type", {
      enum: ["day", "night"],
    }).default("day"),
    lunchDeductionMinutes: integer("lunch_deduction_minutes").default(0),
    totalWorkingMinutes: integer("total_working_minutes").default(0),
    justification: text("justification"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_attendance_employee_date").on(
      table.employeeId,
      table.scheduledShiftDate
    ),
    index("idx_attendance_project_date").on(
      table.projectId,
      table.scheduledShiftDate
    ),
  ]
);

export const attendanceVerifications = pgTable("attendance_verifications", {
  id: serial("id").primaryKey(),
  attendanceLogId: integer("attendance_log_id")
    .notNull()
    .references(() => attendanceLogs.id, { onDelete: "cascade" }),
  verifiedBy: integer("verified_by").references(() => users.id),
  status: text("status", {
    enum: ["Verified", "Off-site", "Flagged"],
  }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ PAYROLL ============

export const payrollPeriods = pgTable("payroll_periods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: text("type", { enum: ["semi-monthly", "monthly"] })
    .notNull()
    .default("semi-monthly"),
  status: text("status", { enum: ["Open", "Closed"] })
    .notNull()
    .default("Open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  periodId: integer("period_id")
    .notNull()
    .references(() => payrollPeriods.id),
  daysWorked: numeric("days_worked", { precision: 5, scale: 2 }),
  basicPay: numeric("basic_pay", { precision: 12, scale: 2 }).default("0"),
  overtimePay: numeric("overtime_pay", { precision: 12, scale: 2 }).default("0"),
  holidayPay: numeric("holiday_pay", { precision: 12, scale: 2 }).default("0"),
  allowances: numeric("allowances", { precision: 12, scale: 2 }).default("0"),
  grossPay: numeric("gross_pay", { precision: 12, scale: 2 }).default("0"),
  sssDeduction: numeric("sss_deduction", { precision: 10, scale: 2 }).default("0"),
  philhealthDeduction: numeric("philhealth_deduction", { precision: 10, scale: 2 }).default("0"),
  pagibigDeduction: numeric("pagibig_deduction", { precision: 10, scale: 2 }).default("0"),
  withholdingTax: numeric("withholding_tax", { precision: 10, scale: 2 }).default("0"),
  cashAdvanceDeduction: numeric("cash_advance_deduction", { precision: 10, scale: 2 }).default("0"),
  lateDeduction: numeric("late_deduction", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: numeric("other_deductions", { precision: 10, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }).default("0"),
  netPay: numeric("net_pay", { precision: 12, scale: 2 }).default("0"),
  status: text("status", { enum: ["DRAFT", "APPROVED", "RELEASED"] })
    .notNull()
    .default("DRAFT"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  releasedBy: integer("released_by"),
  releasedAt: timestamp("released_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payslips = pgTable("payslips", {
  id: serial("id").primaryKey(),
  payrollRecordId: integer("payroll_record_id")
    .notNull()
    .references(() => payrollRecords.id),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  periodId: integer("period_id")
    .notNull()
    .references(() => payrollPeriods.id),
  payslipData: json("payslip_data"), // full breakdown
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ LEAVE MANAGEMENT ============

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  daysPerYear: integer("days_per_year").notNull().default(0),
  isPaid: boolean("is_paid").notNull().default(true),
  accrualMode: text("accrual_mode", { enum: ["annual", "monthly"] })
    .notNull()
    .default("annual"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leaveAllocations = pgTable("leave_allocations", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  leaveTypeId: integer("leave_type_id")
    .notNull()
    .references(() => leaveTypes.id),
  year: integer("year").notNull(),
  totalDays: numeric("total_days", { precision: 5, scale: 2 }).notNull(),
  usedDays: numeric("used_days", { precision: 5, scale: 2 }).default("0"),
  remainingDays: numeric("remaining_days", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    leaveTypeId: integer("leave_type_id")
      .notNull()
      .references(() => leaveTypes.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    totalDays: numeric("total_days", { precision: 5, scale: 2 }).notNull(),
    reason: text("reason"),
    status: text("status", {
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
    })
      .notNull()
      .default("Pending"),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_leave_request_employee").on(table.employeeId),
    index("idx_leave_request_status").on(table.status),
    index("idx_leave_request_dates").on(table.startDate, table.endDate),
    index("idx_leave_request_employee_status").on(
      table.employeeId,
      table.status
    ),
  ]
);

export const holidays = pgTable(
  "holidays",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    date: date("date").notNull(),
    type: text("type", {
      enum: ["Regular", "Special Non-Working", "Special Working"],
    }).notNull(),
    year: integer("year").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_holiday_year").on(table.year),
    index("idx_holiday_date").on(table.date),
  ]
);

// ============ CASH ADVANCES ============

export const cashAdvances = pgTable(
  "cash_advances",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason"),
    deductionPerCutoff: numeric("deduction_per_cutoff", {
      precision: 10,
      scale: 2,
    }).notNull(),
    remainingBalance: numeric("remaining_balance", {
      precision: 12,
      scale: 2,
    }).notNull(),
    status: text("status", {
      enum: [
        "Pending",
        "Approved",
        "Rejected",
        "Disbursed",
        "Fully_Paid",
        "Cancelled",
      ],
    })
      .notNull()
      .default("Pending"),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at"),
    disbursedAt: timestamp("disbursed_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cash_advance_employee").on(table.employeeId),
    index("idx_cash_advance_status").on(table.status),
  ]
);

export const cashAdvanceDeductions = pgTable("cash_advance_deductions", {
  id: serial("id").primaryKey(),
  cashAdvanceId: integer("cash_advance_id")
    .notNull()
    .references(() => cashAdvances.id, { onDelete: "cascade" }),
  payrollRecordId: integer("payroll_record_id").references(
    () => payrollRecords.id
  ),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  deductionDate: date("deduction_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ DISCIPLINARY ============

export const disciplinaryRecords = pgTable("disciplinary_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  issuedBy: integer("issued_by")
    .notNull()
    .references(() => users.id),
  violation: text("violation").notNull(),
  description: text("description"),
  severity: text("severity", {
    enum: ["Minor", "Major", "Grave"],
  })
    .notNull()
    .default("Minor"),
  dateIssued: date("date_issued").notNull(),
  deadline: date("deadline").notNull(),
  status: text("status", {
    enum: ["Issued", "Explanation_Received", "Resolved"],
  })
    .notNull()
    .default("Issued"),
  resolution: text("resolution"),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const disciplinaryExplanations = pgTable("disciplinary_explanations", {
  id: serial("id").primaryKey(),
  disciplinaryId: integer("disciplinary_id")
    .notNull()
    .references(() => disciplinaryRecords.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  explanation: text("explanation").notNull(),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const disciplinarySanctions = pgTable("disciplinary_sanctions", {
  id: serial("id").primaryKey(),
  disciplinaryId: integer("disciplinary_id")
    .notNull()
    .references(() => disciplinaryRecords.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "Verbal Warning",
      "Written Warning",
      "Suspension",
      "Termination",
    ],
  }).notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  notes: text("notes"),
  issuedBy: integer("issued_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ EXPENSES ============

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id")
      .notNull()
      .references(() => employees.id),
    projectId: integer("project_id").references(() => projects.id),
    category: text("category").notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    receiptUrl: text("receipt_url"),
    status: text("status", {
      enum: ["Pending", "Approved", "Rejected", "Reimbursed"],
    })
      .notNull()
      .default("Pending"),
    approvedBy: integer("approved_by"),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_expense_requester_status").on(
      table.requesterId,
      table.status
    ),
  ]
);

export const expenseApprovals = pgTable("expense_approvals", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  approverId: integer("approver_id")
    .notNull()
    .references(() => users.id),
  action: text("action", { enum: ["Approved", "Rejected"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ DEVOTIONALS ============

export const devotionals = pgTable("devotionals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  scriptureReference: text("scripture_reference"),
  date: date("date").notNull(),
  authorId: integer("author_id").references(() => users.id),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const devotionalReadingLogs = pgTable("devotional_reading_logs", {
  id: serial("id").primaryKey(),
  devotionalId: integer("devotional_id")
    .notNull()
    .references(() => devotionals.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  readAt: timestamp("read_at").notNull().defaultNow(),
});

// ============ SYSTEM ============

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action", {
    enum: ["CREATE", "READ", "UPDATE", "DELETE", "APPROVE", "RELEASE"],
  }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============ INSERT / SELECT SCHEMAS ============

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);
export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export const insertAttendanceLogSchema = createInsertSchema(attendanceLogs);
export const selectAttendanceLogSchema = createSelectSchema(attendanceLogs);
export const insertPayrollRecordSchema = createInsertSchema(payrollRecords);
export const selectPayrollRecordSchema = createSelectSchema(payrollRecords);
export const insertLeaveRequestSchema = createInsertSchema(leaveRequests);
export const selectLeaveRequestSchema = createSelectSchema(leaveRequests);
export const insertCashAdvanceSchema = createInsertSchema(cashAdvances);
export const selectCashAdvanceSchema = createSelectSchema(cashAdvances);
export const insertDisciplinaryRecordSchema = createInsertSchema(disciplinaryRecords);
export const selectDisciplinaryRecordSchema = createSelectSchema(disciplinaryRecords);
export const insertExpenseSchema = createInsertSchema(expenses);
export const selectExpenseSchema = createSelectSchema(expenses);
export const insertDevotionalSchema = createInsertSchema(devotionals);
export const selectDevotionalSchema = createSelectSchema(devotionals);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);

// ============ TYPES ============

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = typeof projectAssignments.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type InsertAttendanceLog = typeof attendanceLogs.$inferInsert;
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type InsertPayrollPeriod = typeof payrollPeriods.$inferInsert;
export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type InsertPayrollRecord = typeof payrollRecords.$inferInsert;
export type Payslip = typeof payslips.$inferSelect;
export type InsertPayslip = typeof payslips.$inferInsert;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = typeof leaveTypes.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = typeof holidays.$inferInsert;
export type CashAdvance = typeof cashAdvances.$inferSelect;
export type InsertCashAdvance = typeof cashAdvances.$inferInsert;
export type DisciplinaryRecord = typeof disciplinaryRecords.$inferSelect;
export type InsertDisciplinaryRecord = typeof disciplinaryRecords.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type Devotional = typeof devotionals.$inferSelect;
export type InsertDevotional = typeof devotionals.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type LeaveAllocation = typeof leaveAllocations.$inferSelect;
export type InsertLeaveAllocation = typeof leaveAllocations.$inferInsert;
export type CompanySetting = typeof companySettings.$inferSelect;
