import {
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  between,
  like,
  or,
  isNull,
  ne,
} from "drizzle-orm";
import { db } from "./db";
import {
  users,
  employees,
  employeeDocuments,
  projects,
  projectAssignments,
  tasks,
  taskComments,
  attendanceLogs,
  payrollPeriods,
  payrollRecords,
  payslips,
  leaveTypes,
  leaveAllocations,
  leaveRequests,
  holidays,
  cashAdvances,
  cashAdvanceDeductions,
  disciplinaryRecords,
  disciplinaryExplanations,
  disciplinarySanctions,
  expenses,
  devotionals,
  devotionalReadingLogs,
  auditLogs,
  companySettings,
  type User,
  type InsertUser,
  type Employee,
  type InsertEmployee,
  type Project,
  type InsertProject,
  type ProjectAssignment,
  type InsertProjectAssignment,
  type Task,
  type InsertTask,
  type AttendanceLog,
  type InsertAttendanceLog,
  type PayrollPeriod,
  type InsertPayrollPeriod,
  type PayrollRecord,
  type InsertPayrollRecord,
  type Payslip,
  type InsertPayslip,
  type LeaveType,
  type InsertLeaveType,
  type LeaveAllocation,
  type InsertLeaveAllocation,
  type LeaveRequest,
  type InsertLeaveRequest,
  type Holiday,
  type InsertHoliday,
  type CashAdvance,
  type InsertCashAdvance,
  type DisciplinaryRecord,
  type InsertDisciplinaryRecord,
  type Expense,
  type InsertExpense,
  type Devotional,
  type InsertDevotional,
  type AuditLog,
  type InsertAuditLog,
  type CompanySetting,
} from "@shared/schema";
import { getTodayPH } from "./utils/datetime";

// Inferred types for tables without explicit type exports
type EmployeeDocument = typeof employeeDocuments.$inferSelect;
type InsertEmployeeDocument = typeof employeeDocuments.$inferInsert;
type TaskComment = typeof taskComments.$inferSelect;
type InsertTaskComment = typeof taskComments.$inferInsert;
type CashAdvanceDeduction = typeof cashAdvanceDeductions.$inferSelect;
type InsertCashAdvanceDeduction = typeof cashAdvanceDeductions.$inferInsert;
type DisciplinaryExplanation = typeof disciplinaryExplanations.$inferSelect;
type InsertDisciplinaryExplanation = typeof disciplinaryExplanations.$inferInsert;
type DisciplinarySanction = typeof disciplinarySanctions.$inferSelect;
type InsertDisciplinarySanction = typeof disciplinarySanctions.$inferInsert;
type DevotionalReadingLog = typeof devotionalReadingLogs.$inferSelect;

// ============ FILTER TYPES ============

export interface EmployeeFilters {
  status?: string;
  department?: string;
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TaskFilters {
  projectId?: number;
  assignedTo?: number;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceFilters {
  employeeId?: number;
  projectId?: number;
  startDate?: string;
  endDate?: string;
  verificationStatus?: string;
  page?: number;
  limit?: number;
}

export interface LeaveRequestFilters {
  employeeId?: number;
  status?: string;
  leaveTypeId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CashAdvanceFilters {
  employeeId?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface DisciplinaryFilters {
  employeeId?: number;
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}

export interface ExpenseFilters {
  requesterId?: number;
  projectId?: number;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogFilters {
  userId?: number;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ============ INTERFACE ============

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  // Employees
  getAllEmployees(filters?: EmployeeFilters): Promise<{ data: Employee[]; total: number }>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByNo(employeeNo: string): Promise<Employee | undefined>;
  getEmployeeByQrToken(token: string): Promise<Employee | undefined>;
  createEmployee(data: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;
  getEmployeeCompleteFile(id: number): Promise<any>;

  // Employee Documents
  getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]>;
  createDocument(data: InsertEmployeeDocument): Promise<EmployeeDocument>;
  deleteDocument(id: number): Promise<void>;

  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Project Assignments
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  getEmployeeAssignments(employeeId: number): Promise<ProjectAssignment[]>;
  createAssignment(data: InsertProjectAssignment): Promise<ProjectAssignment>;
  updateAssignment(id: number, data: Partial<InsertProjectAssignment>): Promise<ProjectAssignment | undefined>;

  // Tasks
  getAllTasks(filters?: TaskFilters): Promise<{ data: Task[]; total: number }>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;

  // Task Comments
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(data: InsertTaskComment): Promise<TaskComment>;

  // Attendance
  getTodayAttendance(): Promise<AttendanceLog[]>;
  getAttendanceLogs(filters: AttendanceFilters): Promise<{ data: AttendanceLog[]; total: number }>;
  getAttendanceLog(id: number): Promise<AttendanceLog | undefined>;
  createAttendanceLog(data: InsertAttendanceLog): Promise<AttendanceLog>;
  updateAttendanceLog(id: number, data: Partial<InsertAttendanceLog>): Promise<AttendanceLog | undefined>;
  getActiveClockIn(employeeId: number): Promise<AttendanceLog | undefined>;

  // Payroll Periods
  getPayrollPeriods(): Promise<PayrollPeriod[]>;
  createPayrollPeriod(data: InsertPayrollPeriod): Promise<PayrollPeriod>;
  updatePayrollPeriod(id: number, data: Partial<InsertPayrollPeriod>): Promise<PayrollPeriod | undefined>;

  // Payroll Records
  getPayrollRecords(periodId?: number): Promise<PayrollRecord[]>;
  getPayrollRecord(id: number): Promise<PayrollRecord | undefined>;
  createPayrollRecord(data: InsertPayrollRecord): Promise<PayrollRecord>;
  updatePayrollRecord(id: number, data: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined>;

  // Payslips
  getPayslip(id: number): Promise<Payslip | undefined>;
  getPayslipByEmployee(employeeId: number, periodId: number): Promise<Payslip | undefined>;
  createPayslip(data: InsertPayslip): Promise<Payslip>;

  // Leave Types
  getLeaveTypes(): Promise<LeaveType[]>;
  createLeaveType(data: InsertLeaveType): Promise<LeaveType>;
  updateLeaveType(id: number, data: Partial<InsertLeaveType>): Promise<LeaveType | undefined>;

  // Leave Allocations
  getLeaveAllocations(employeeId: number, year?: number): Promise<LeaveAllocation[]>;
  createLeaveAllocation(data: InsertLeaveAllocation): Promise<LeaveAllocation>;
  updateLeaveAllocation(id: number, data: Partial<InsertLeaveAllocation>): Promise<LeaveAllocation | undefined>;

  // Leave Requests
  getLeaveRequests(filters?: LeaveRequestFilters): Promise<{ data: LeaveRequest[]; total: number }>;
  getLeaveRequest(id: number): Promise<LeaveRequest | undefined>;
  createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;

  // Holidays
  getHolidays(year?: number): Promise<Holiday[]>;
  createHoliday(data: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, data: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<void>;

  // Cash Advances
  getCashAdvances(filters?: CashAdvanceFilters): Promise<{ data: CashAdvance[]; total: number }>;
  getCashAdvance(id: number): Promise<CashAdvance | undefined>;
  createCashAdvance(data: InsertCashAdvance): Promise<CashAdvance>;
  updateCashAdvance(id: number, data: Partial<InsertCashAdvance>): Promise<CashAdvance | undefined>;

  // Cash Advance Deductions
  getCashAdvanceDeductions(cashAdvanceId: number): Promise<CashAdvanceDeduction[]>;
  createCashAdvanceDeduction(data: InsertCashAdvanceDeduction): Promise<CashAdvanceDeduction>;

  // Disciplinary
  getDisciplinaryRecords(filters?: DisciplinaryFilters): Promise<{ data: DisciplinaryRecord[]; total: number }>;
  getDisciplinaryRecord(id: number): Promise<DisciplinaryRecord | undefined>;
  createDisciplinaryRecord(data: InsertDisciplinaryRecord): Promise<DisciplinaryRecord>;
  updateDisciplinaryRecord(id: number, data: Partial<InsertDisciplinaryRecord>): Promise<DisciplinaryRecord | undefined>;
  createExplanation(data: InsertDisciplinaryExplanation): Promise<DisciplinaryExplanation>;
  createSanction(data: InsertDisciplinarySanction): Promise<DisciplinarySanction>;

  // Expenses
  getExpenses(filters?: ExpenseFilters): Promise<{ data: Expense[]; total: number }>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(data: InsertExpense): Promise<Expense>;
  updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined>;

  // Devotionals
  getDevotionals(): Promise<Devotional[]>;
  getTodayDevotional(): Promise<Devotional | undefined>;
  getDevotional(id: number): Promise<Devotional | undefined>;
  createDevotional(data: InsertDevotional): Promise<Devotional>;
  updateDevotional(id: number, data: Partial<InsertDevotional>): Promise<Devotional | undefined>;
  deleteDevotional(id: number): Promise<void>;
  markDevotionalRead(devotionalId: number, userId: number): Promise<DevotionalReadingLog>;

  // Audit Logs
  getAuditLogs(filters?: AuditLogFilters): Promise<{ data: AuditLog[]; total: number }>;
  getAuditLog(id: number): Promise<AuditLog | undefined>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;

  // Company Settings
  getSettings(): Promise<CompanySetting[]>;
  getSetting(key: string): Promise<CompanySetting | undefined>;
  setSetting(key: string, value: string, description?: string): Promise<CompanySetting>;

  // Dashboard
  getDashboardStatistics(): Promise<any>;
}

// ============ DATABASE STORAGE IMPLEMENTATION ============

export class DatabaseStorage implements IStorage {
  // ==================== USERS ====================

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // ==================== EMPLOYEES ====================

  async getAllEmployees(filters?: EmployeeFilters): Promise<{ data: Employee[]; total: number }> {
    const conditions = [eq(employees.isDeleted, false)];

    if (filters?.status) {
      conditions.push(eq(employees.status, filters.status));
    }
    if (filters?.department) {
      conditions.push(eq(employees.department, filters.department));
    }
    if (filters?.role) {
      conditions.push(eq(employees.role, filters.role));
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(employees.firstName, searchTerm),
          like(employees.lastName, searchTerm),
          like(employees.employeeNo, searchTerm),
          like(employees.email, searchTerm),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: count() })
      .from(employees)
      .where(whereClause);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(employees)
      .where(whereClause)
      .orderBy(asc(employees.lastName), asc(employees.firstName))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.isDeleted, false)))
      .limit(1);
    return employee;
  }

  async getEmployeeByNo(employeeNo: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.employeeNo, employeeNo), eq(employees.isDeleted, false)))
      .limit(1);
    return employee;
  }

  async getEmployeeByQrToken(token: string): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.qrToken, token), eq(employees.isDeleted, false)))
      .limit(1);
    return employee;
  }

  async createEmployee(data: InsertEmployee): Promise<Employee> {
    const [employee] = await db.insert(employees).values(data).returning();
    return employee;
  }

  async updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(employees.id, id), eq(employees.isDeleted, false)))
      .returning();
    return employee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db
      .update(employees)
      .set({ isDeleted: true, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(employees.id, id));
  }

  async getEmployeeCompleteFile(id: number): Promise<any> {
    const employee = await this.getEmployee(id);
    if (!employee) return undefined;

    const [documents, assignments, leaveAllocs, leaveReqs, cashAdvs, disciplinary, attendanceRecords] =
      await Promise.all([
        this.getEmployeeDocuments(id),
        this.getEmployeeAssignments(id),
        this.getLeaveAllocations(id),
        this.getLeaveRequests({ employeeId: id }),
        this.getCashAdvances({ employeeId: id }),
        this.getDisciplinaryRecords({ employeeId: id }),
        db
          .select()
          .from(attendanceLogs)
          .where(eq(attendanceLogs.employeeId, id))
          .orderBy(desc(attendanceLogs.timeIn))
          .limit(30),
      ]);

    return {
      employee,
      documents,
      projectAssignments: assignments,
      leaveAllocations: leaveAllocs,
      leaveRequests: leaveReqs.data,
      cashAdvances: cashAdvs.data,
      disciplinaryRecords: disciplinary.data,
      recentAttendance: attendanceRecords,
    };
  }

  // ==================== EMPLOYEE DOCUMENTS ====================

  async getEmployeeDocuments(employeeId: number): Promise<EmployeeDocument[]> {
    return db
      .select()
      .from(employeeDocuments)
      .where(eq(employeeDocuments.employeeId, employeeId))
      .orderBy(desc(employeeDocuments.createdAt));
  }

  async createDocument(data: InsertEmployeeDocument): Promise<EmployeeDocument> {
    const [doc] = await db.insert(employeeDocuments).values(data).returning();
    return doc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(employeeDocuments).where(eq(employeeDocuments.id, id));
  }

  // ==================== PROJECTS ====================

  async getAllProjects(): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.isDeleted, false))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.isDeleted, false)))
      .limit(1);
    return project;
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(id: number, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.isDeleted, false)))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    await db
      .update(projects)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  // ==================== PROJECT ASSIGNMENTS ====================

  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId))
      .orderBy(desc(projectAssignments.createdAt));
  }

  async getEmployeeAssignments(employeeId: number): Promise<ProjectAssignment[]> {
    return db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.employeeId, employeeId))
      .orderBy(desc(projectAssignments.createdAt));
  }

  async createAssignment(data: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [assignment] = await db.insert(projectAssignments).values(data).returning();
    return assignment;
  }

  async updateAssignment(
    id: number,
    data: Partial<InsertProjectAssignment>,
  ): Promise<ProjectAssignment | undefined> {
    const [assignment] = await db
      .update(projectAssignments)
      .set(data)
      .where(eq(projectAssignments.id, id))
      .returning();
    return assignment;
  }

  // ==================== TASKS ====================

  async getAllTasks(filters?: TaskFilters): Promise<{ data: Task[]; total: number }> {
    const conditions = [eq(tasks.isDeleted, false)];

    if (filters?.projectId) {
      conditions.push(eq(tasks.projectId, filters.projectId));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(tasks.assignedTo, filters.assignedTo));
    }
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(whereClause);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(tasks)
      .where(whereClause)
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.isDeleted, false)))
      .limit(1);
    return task;
  }

  async createTask(data: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(data).returning();
    return task;
  }

  async updateTask(id: number, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.isDeleted, false)))
      .returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db
      .update(tasks)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(tasks.id, id));
  }

  // ==================== TASK COMMENTS ====================

  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt));
  }

  async createTaskComment(data: InsertTaskComment): Promise<TaskComment> {
    const [comment] = await db.insert(taskComments).values(data).returning();
    return comment;
  }

  // ==================== ATTENDANCE ====================

  async getTodayAttendance(): Promise<AttendanceLog[]> {
    const today = getTodayPH();
    return db
      .select()
      .from(attendanceLogs)
      .where(eq(attendanceLogs.scheduledShiftDate, today))
      .orderBy(desc(attendanceLogs.timeIn));
  }

  async getAttendanceLogs(
    filters: AttendanceFilters,
  ): Promise<{ data: AttendanceLog[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters.employeeId) {
      conditions.push(eq(attendanceLogs.employeeId, filters.employeeId));
    }
    if (filters.projectId) {
      conditions.push(eq(attendanceLogs.projectId, filters.projectId));
    }
    if (filters.verificationStatus) {
      conditions.push(eq(attendanceLogs.verificationStatus, filters.verificationStatus));
    }
    if (filters.startDate && filters.endDate) {
      conditions.push(
        between(attendanceLogs.scheduledShiftDate, filters.startDate, filters.endDate),
      );
    } else if (filters.startDate) {
      conditions.push(sql`${attendanceLogs.scheduledShiftDate} >= ${filters.startDate}`);
    } else if (filters.endDate) {
      conditions.push(sql`${attendanceLogs.scheduledShiftDate} <= ${filters.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(attendanceLogs)
      .where(whereClause);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(attendanceLogs)
      .where(whereClause)
      .orderBy(desc(attendanceLogs.timeIn))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getAttendanceLog(id: number): Promise<AttendanceLog | undefined> {
    const [log] = await db
      .select()
      .from(attendanceLogs)
      .where(eq(attendanceLogs.id, id))
      .limit(1);
    return log;
  }

  async createAttendanceLog(data: InsertAttendanceLog): Promise<AttendanceLog> {
    const [log] = await db.insert(attendanceLogs).values(data).returning();
    return log;
  }

  async updateAttendanceLog(
    id: number,
    data: Partial<InsertAttendanceLog>,
  ): Promise<AttendanceLog | undefined> {
    const [log] = await db
      .update(attendanceLogs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(attendanceLogs.id, id))
      .returning();
    return log;
  }

  async getActiveClockIn(employeeId: number): Promise<AttendanceLog | undefined> {
    const today = getTodayPH();
    const [log] = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.employeeId, employeeId),
          eq(attendanceLogs.scheduledShiftDate, today),
          isNull(attendanceLogs.timeOut),
        ),
      )
      .orderBy(desc(attendanceLogs.timeIn))
      .limit(1);
    return log;
  }

  // ==================== PAYROLL PERIODS ====================

  async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    return db
      .select()
      .from(payrollPeriods)
      .orderBy(desc(payrollPeriods.startDate));
  }

  async createPayrollPeriod(data: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const [period] = await db.insert(payrollPeriods).values(data).returning();
    return period;
  }

  async updatePayrollPeriod(
    id: number,
    data: Partial<InsertPayrollPeriod>,
  ): Promise<PayrollPeriod | undefined> {
    const [period] = await db
      .update(payrollPeriods)
      .set(data)
      .where(eq(payrollPeriods.id, id))
      .returning();
    return period;
  }

  // ==================== PAYROLL RECORDS ====================

  async getPayrollRecords(periodId?: number): Promise<PayrollRecord[]> {
    if (periodId) {
      return db
        .select()
        .from(payrollRecords)
        .where(eq(payrollRecords.periodId, periodId))
        .orderBy(desc(payrollRecords.createdAt));
    }
    return db
      .select()
      .from(payrollRecords)
      .orderBy(desc(payrollRecords.createdAt));
  }

  async getPayrollRecord(id: number): Promise<PayrollRecord | undefined> {
    const [record] = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.id, id))
      .limit(1);
    return record;
  }

  async createPayrollRecord(data: InsertPayrollRecord): Promise<PayrollRecord> {
    const [record] = await db.insert(payrollRecords).values(data).returning();
    return record;
  }

  async updatePayrollRecord(
    id: number,
    data: Partial<InsertPayrollRecord>,
  ): Promise<PayrollRecord | undefined> {
    const [record] = await db
      .update(payrollRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payrollRecords.id, id))
      .returning();
    return record;
  }

  // ==================== PAYSLIPS ====================

  async getPayslip(id: number): Promise<Payslip | undefined> {
    const [payslip] = await db
      .select()
      .from(payslips)
      .where(eq(payslips.id, id))
      .limit(1);
    return payslip;
  }

  async getPayslipByEmployee(employeeId: number, periodId: number): Promise<Payslip | undefined> {
    const [payslip] = await db
      .select()
      .from(payslips)
      .where(
        and(eq(payslips.employeeId, employeeId), eq(payslips.periodId, periodId)),
      )
      .limit(1);
    return payslip;
  }

  async createPayslip(data: InsertPayslip): Promise<Payslip> {
    const [payslip] = await db.insert(payslips).values(data).returning();
    return payslip;
  }

  // ==================== LEAVE TYPES ====================

  async getLeaveTypes(): Promise<LeaveType[]> {
    return db
      .select()
      .from(leaveTypes)
      .orderBy(asc(leaveTypes.name));
  }

  async createLeaveType(data: InsertLeaveType): Promise<LeaveType> {
    const [type] = await db.insert(leaveTypes).values(data).returning();
    return type;
  }

  async updateLeaveType(
    id: number,
    data: Partial<InsertLeaveType>,
  ): Promise<LeaveType | undefined> {
    const [type] = await db
      .update(leaveTypes)
      .set(data)
      .where(eq(leaveTypes.id, id))
      .returning();
    return type;
  }

  // ==================== LEAVE ALLOCATIONS ====================

  async getLeaveAllocations(employeeId: number, year?: number): Promise<LeaveAllocation[]> {
    const conditions = [eq(leaveAllocations.employeeId, employeeId)];
    if (year) {
      conditions.push(eq(leaveAllocations.year, year));
    }
    return db
      .select()
      .from(leaveAllocations)
      .where(and(...conditions))
      .orderBy(asc(leaveAllocations.year));
  }

  async createLeaveAllocation(data: InsertLeaveAllocation): Promise<LeaveAllocation> {
    const [allocation] = await db.insert(leaveAllocations).values(data).returning();
    return allocation;
  }

  async updateLeaveAllocation(
    id: number,
    data: Partial<InsertLeaveAllocation>,
  ): Promise<LeaveAllocation | undefined> {
    const [allocation] = await db
      .update(leaveAllocations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveAllocations.id, id))
      .returning();
    return allocation;
  }

  // ==================== LEAVE REQUESTS ====================

  async getLeaveRequests(
    filters?: LeaveRequestFilters,
  ): Promise<{ data: LeaveRequest[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.employeeId) {
      conditions.push(eq(leaveRequests.employeeId, filters.employeeId));
    }
    if (filters?.status) {
      conditions.push(eq(leaveRequests.status, filters.status));
    }
    if (filters?.leaveTypeId) {
      conditions.push(eq(leaveRequests.leaveTypeId, filters.leaveTypeId));
    }
    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        between(leaveRequests.startDate, filters.startDate, filters.endDate),
      );
    } else if (filters?.startDate) {
      conditions.push(sql`${leaveRequests.startDate} >= ${filters.startDate}`);
    } else if (filters?.endDate) {
      conditions.push(sql`${leaveRequests.endDate} <= ${filters.endDate}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(leaveRequests)
      .where(whereClause);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(leaveRequests)
      .where(whereClause)
      .orderBy(desc(leaveRequests.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, id))
      .limit(1);
    return request;
  }

  async createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest> {
    const [request] = await db.insert(leaveRequests).values(data).returning();
    return request;
  }

  async updateLeaveRequest(
    id: number,
    data: Partial<InsertLeaveRequest>,
  ): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .update(leaveRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaveRequests.id, id))
      .returning();
    return request;
  }

  // ==================== HOLIDAYS ====================

  async getHolidays(year?: number): Promise<Holiday[]> {
    if (year) {
      return db
        .select()
        .from(holidays)
        .where(eq(holidays.year, year))
        .orderBy(asc(holidays.date));
    }
    return db
      .select()
      .from(holidays)
      .orderBy(asc(holidays.date));
  }

  async createHoliday(data: InsertHoliday): Promise<Holiday> {
    const [holiday] = await db.insert(holidays).values(data).returning();
    return holiday;
  }

  async updateHoliday(id: number, data: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [holiday] = await db
      .update(holidays)
      .set(data)
      .where(eq(holidays.id, id))
      .returning();
    return holiday;
  }

  async deleteHoliday(id: number): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // ==================== CASH ADVANCES ====================

  async getCashAdvances(
    filters?: CashAdvanceFilters,
  ): Promise<{ data: CashAdvance[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.employeeId) {
      conditions.push(eq(cashAdvances.employeeId, filters.employeeId));
    }
    if (filters?.status) {
      conditions.push(eq(cashAdvances.status, filters.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(cashAdvances)
      .where(whereClause);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(cashAdvances)
      .where(whereClause)
      .orderBy(desc(cashAdvances.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getCashAdvance(id: number): Promise<CashAdvance | undefined> {
    const [advance] = await db
      .select()
      .from(cashAdvances)
      .where(eq(cashAdvances.id, id))
      .limit(1);
    return advance;
  }

  async createCashAdvance(data: InsertCashAdvance): Promise<CashAdvance> {
    const [advance] = await db.insert(cashAdvances).values(data).returning();
    return advance;
  }

  async updateCashAdvance(
    id: number,
    data: Partial<InsertCashAdvance>,
  ): Promise<CashAdvance | undefined> {
    const [advance] = await db
      .update(cashAdvances)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cashAdvances.id, id))
      .returning();
    return advance;
  }

  // ==================== CASH ADVANCE DEDUCTIONS ====================

  async getCashAdvanceDeductions(cashAdvanceId: number): Promise<CashAdvanceDeduction[]> {
    return db
      .select()
      .from(cashAdvanceDeductions)
      .where(eq(cashAdvanceDeductions.cashAdvanceId, cashAdvanceId))
      .orderBy(asc(cashAdvanceDeductions.deductionDate));
  }

  async createCashAdvanceDeduction(data: InsertCashAdvanceDeduction): Promise<CashAdvanceDeduction> {
    const [deduction] = await db.insert(cashAdvanceDeductions).values(data).returning();
    return deduction;
  }

  // ==================== DISCIPLINARY ====================

  async getDisciplinaryRecords(
    filters?: DisciplinaryFilters,
  ): Promise<{ data: DisciplinaryRecord[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.employeeId) {
      conditions.push(eq(disciplinaryRecords.employeeId, filters.employeeId));
    }
    if (filters?.status) {
      conditions.push(eq(disciplinaryRecords.status, filters.status));
    }
    if (filters?.severity) {
      conditions.push(eq(disciplinaryRecords.severity, filters.severity));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(disciplinaryRecords)
      .where(whereClause);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(disciplinaryRecords)
      .where(whereClause)
      .orderBy(desc(disciplinaryRecords.dateIssued))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getDisciplinaryRecord(id: number): Promise<DisciplinaryRecord | undefined> {
    const [record] = await db
      .select()
      .from(disciplinaryRecords)
      .where(eq(disciplinaryRecords.id, id))
      .limit(1);
    return record;
  }

  async createDisciplinaryRecord(data: InsertDisciplinaryRecord): Promise<DisciplinaryRecord> {
    const [record] = await db.insert(disciplinaryRecords).values(data).returning();
    return record;
  }

  async updateDisciplinaryRecord(
    id: number,
    data: Partial<InsertDisciplinaryRecord>,
  ): Promise<DisciplinaryRecord | undefined> {
    const [record] = await db
      .update(disciplinaryRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(disciplinaryRecords.id, id))
      .returning();
    return record;
  }

  async createExplanation(data: InsertDisciplinaryExplanation): Promise<DisciplinaryExplanation> {
    const [explanation] = await db
      .insert(disciplinaryExplanations)
      .values(data)
      .returning();
    return explanation;
  }

  async createSanction(data: InsertDisciplinarySanction): Promise<DisciplinarySanction> {
    const [sanction] = await db
      .insert(disciplinarySanctions)
      .values(data)
      .returning();
    return sanction;
  }

  // ==================== EXPENSES ====================

  async getExpenses(
    filters?: ExpenseFilters,
  ): Promise<{ data: Expense[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.requesterId) {
      conditions.push(eq(expenses.requesterId, filters.requesterId));
    }
    if (filters?.projectId) {
      conditions.push(eq(expenses.projectId, filters.projectId));
    }
    if (filters?.status) {
      conditions.push(eq(expenses.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(expenses.category, filters.category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(expenses)
      .where(whereClause);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(expenses)
      .where(whereClause)
      .orderBy(desc(expenses.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id))
      .limit(1);
    return expense;
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(data).returning();
    return expense;
  }

  async updateExpense(id: number, data: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();
    return expense;
  }

  // ==================== DEVOTIONALS ====================

  async getDevotionals(): Promise<Devotional[]> {
    return db
      .select()
      .from(devotionals)
      .orderBy(desc(devotionals.date));
  }

  async getTodayDevotional(): Promise<Devotional | undefined> {
    const today = getTodayPH();
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(and(eq(devotionals.date, today), eq(devotionals.isPublished, true)))
      .limit(1);
    return devotional;
  }

  async getDevotional(id: number): Promise<Devotional | undefined> {
    const [devotional] = await db
      .select()
      .from(devotionals)
      .where(eq(devotionals.id, id))
      .limit(1);
    return devotional;
  }

  async createDevotional(data: InsertDevotional): Promise<Devotional> {
    const [devotional] = await db.insert(devotionals).values(data).returning();
    return devotional;
  }

  async updateDevotional(
    id: number,
    data: Partial<InsertDevotional>,
  ): Promise<Devotional | undefined> {
    const [devotional] = await db
      .update(devotionals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(devotionals.id, id))
      .returning();
    return devotional;
  }

  async deleteDevotional(id: number): Promise<void> {
    await db.delete(devotionals).where(eq(devotionals.id, id));
  }

  async markDevotionalRead(devotionalId: number, userId: number): Promise<DevotionalReadingLog> {
    // Check if already marked as read
    const [existing] = await db
      .select()
      .from(devotionalReadingLogs)
      .where(
        and(
          eq(devotionalReadingLogs.devotionalId, devotionalId),
          eq(devotionalReadingLogs.userId, userId),
        ),
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [log] = await db
      .insert(devotionalReadingLogs)
      .values({ devotionalId, userId })
      .returning();
    return log;
  }

  // ==================== AUDIT LOGS ====================

  async getAuditLogs(
    filters?: AuditLogFilters,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        sql`${auditLogs.createdAt} >= ${filters.startDate}::timestamp AND ${auditLogs.createdAt} <= ${filters.endDate}::timestamp`,
      );
    } else if (filters?.startDate) {
      conditions.push(sql`${auditLogs.createdAt} >= ${filters.startDate}::timestamp`);
    } else if (filters?.endDate) {
      conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}::timestamp`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(whereClause);

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total: totalResult.count };
  }

  async getAuditLog(id: number): Promise<AuditLog | undefined> {
    const [log] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);
    return log;
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  // ==================== COMPANY SETTINGS ====================

  async getSettings(): Promise<CompanySetting[]> {
    return db
      .select()
      .from(companySettings)
      .orderBy(asc(companySettings.key));
  }

  async getSetting(key: string): Promise<CompanySetting | undefined> {
    const [setting] = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.key, key))
      .limit(1);
    return setting;
  }

  async setSetting(key: string, value: string, description?: string): Promise<CompanySetting> {
    const existing = await this.getSetting(key);

    if (existing) {
      const [updated] = await db
        .update(companySettings)
        .set({ value, description: description ?? existing.description, updatedAt: new Date() })
        .where(eq(companySettings.key, key))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(companySettings)
      .values({ key, value, description })
      .returning();
    return created;
  }

  // ==================== DASHBOARD ====================

  async getDashboardStatistics(): Promise<any> {
    const today = getTodayPH();

    const [
      totalEmployeesResult,
      activeEmployeesResult,
      todayAttendanceResult,
      todayClockedInResult,
      activeProjectsResult,
      pendingLeaveResult,
      pendingExpenseResult,
      openTasksResult,
      pendingCashAdvancesResult,
      openDisciplinaryResult,
    ] = await Promise.all([
      // Total employees (non-deleted)
      db
        .select({ count: count() })
        .from(employees)
        .where(eq(employees.isDeleted, false)),

      // Active employees
      db
        .select({ count: count() })
        .from(employees)
        .where(and(eq(employees.isDeleted, false), eq(employees.status, "Active"))),

      // Today's attendance count
      db
        .select({ count: count() })
        .from(attendanceLogs)
        .where(eq(attendanceLogs.scheduledShiftDate, today)),

      // Currently clocked in (no time out yet today)
      db
        .select({ count: count() })
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.scheduledShiftDate, today),
            isNull(attendanceLogs.timeOut),
          ),
        ),

      // Active projects
      db
        .select({ count: count() })
        .from(projects)
        .where(and(eq(projects.isDeleted, false), eq(projects.status, "Active"))),

      // Pending leave requests
      db
        .select({ count: count() })
        .from(leaveRequests)
        .where(eq(leaveRequests.status, "Pending")),

      // Pending expense requests
      db
        .select({ count: count() })
        .from(expenses)
        .where(eq(expenses.status, "Pending")),

      // Open tasks (not done, not deleted)
      db
        .select({ count: count() })
        .from(tasks)
        .where(and(eq(tasks.isDeleted, false), ne(tasks.status, "Done"))),

      // Pending cash advances
      db
        .select({ count: count() })
        .from(cashAdvances)
        .where(eq(cashAdvances.status, "Pending")),

      // Open disciplinary records (not resolved)
      db
        .select({ count: count() })
        .from(disciplinaryRecords)
        .where(ne(disciplinaryRecords.status, "Resolved")),
    ]);

    return {
      totalEmployees: totalEmployeesResult[0].count,
      activeEmployees: activeEmployeesResult[0].count,
      todayAttendance: todayAttendanceResult[0].count,
      currentlyClockedIn: todayClockedInResult[0].count,
      activeProjects: activeProjectsResult[0].count,
      pendingLeaveRequests: pendingLeaveResult[0].count,
      pendingExpenses: pendingExpenseResult[0].count,
      openTasks: openTasksResult[0].count,
      pendingCashAdvances: pendingCashAdvancesResult[0].count,
      openDisciplinary: openDisciplinaryResult[0].count,
    };
  }
}

export const storage = new DatabaseStorage();
