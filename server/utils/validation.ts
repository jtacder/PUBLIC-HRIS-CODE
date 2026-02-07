import { z } from "zod";

/** Pagination query params */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** ID param */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Date range query */
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** Employee create/update */
export const employeeCreateSchema = z.object({
  employeeNo: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  zipCode: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  civilStatus: z
    .enum(["Single", "Married", "Widowed", "Separated", "Divorced"])
    .optional(),
  position: z.string().min(1),
  department: z.string().optional(),
  hireDate: z.string(),
  status: z
    .enum(["Active", "Probationary", "Terminated", "Suspended", "Resigned"])
    .optional(),
  role: z.enum(["ADMIN", "HR", "ENGINEER", "WORKER"]).optional(),
  sssNo: z.string().optional(),
  philhealthNo: z.string().optional(),
  pagibigNo: z.string().optional(),
  tinNo: z.string().optional(),
  rateType: z.enum(["daily", "monthly"]).optional(),
  dailyRate: z.string().optional(),
  monthlyRate: z.string().optional(),
  shiftStartTime: z.string().optional(),
  shiftEndTime: z.string().optional(),
  shiftWorkDays: z.string().optional(),
});

/** Attendance clock-in */
export const clockInSchema = z.object({
  qrToken: z.string().min(1),
  gpsLatitude: z.number(),
  gpsLongitude: z.number(),
  gpsAccuracy: z.number().optional(),
  photoSnapshot: z.string().optional(),
});

/** Attendance clock-out */
export const clockOutSchema = z.object({
  attendanceId: z.number().int().positive(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
});

/** Leave request create */
export const leaveRequestCreateSchema = z.object({
  employeeId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  startDate: z.string(),
  endDate: z.string(),
  totalDays: z.string(),
  reason: z.string().optional(),
});

/** Cash advance create */
export const cashAdvanceCreateSchema = z.object({
  employeeId: z.number().int().positive(),
  amount: z.string(),
  reason: z.string().optional(),
  deductionPerCutoff: z.string(),
});

/** Project create */
export const projectCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  isOffice: z.boolean().optional(),
  address: z.string().optional(),
  locationLat: z.string().optional(),
  locationLng: z.string().optional(),
  geoRadius: z.number().optional(),
  status: z
    .enum(["Planning", "Active", "On Hold", "Completed", "Cancelled"])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  clientName: z.string().optional(),
  budget: z.string().optional(),
});

/** Task create */
export const taskCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["Todo", "In_Progress", "Blocked", "Done"]).optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  projectId: z.number().optional(),
  assignedTo: z.number().optional(),
  dueDate: z.string().optional(),
});
