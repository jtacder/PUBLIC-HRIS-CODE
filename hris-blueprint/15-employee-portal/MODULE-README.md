# Module 15: Employee Portal (Self-Service)

## Purpose

Self-service portal that allows employees to view and manage their own data without requiring admin or HR intervention. Provides a separate UI context from the admin dashboard with dedicated pages for personal attendance, tasks, payslips, profile, disciplinary records, and requests. All data is strictly scoped to the authenticated employee's own records -- no cross-employee data access is possible through this module.

**Key Design Principle:** This module does NOT own any database tables. It reads from and writes to the same tables used by the admin modules (attendance_logs, tasks, payroll_records, employees, etc.), filtered by the authenticated user's employee_id.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| employee-self-service.ts | server/routes/employee-self-service.ts | Backend | ~15 self-service API endpoints, all scoped to req.user |
| MyAttendance.tsx | client/src/pages/MyAttendance.tsx | Frontend | Personal attendance history and current status |
| MyTasks.tsx | client/src/pages/MyTasks.tsx | Frontend | Assigned tasks with status update capability |
| MyPayslips.tsx | client/src/pages/MyPayslips.tsx | Frontend | Personal payslip history and detail view |
| MyProfile.tsx | client/src/pages/MyProfile.tsx | Frontend | View/edit limited personal profile fields |
| MyDisciplinary.tsx | client/src/pages/MyDisciplinary.tsx | Frontend | View own disciplinary records and NTE responses |
| MyRequests.tsx | client/src/pages/MyRequests.tsx | Frontend | Submit and track leave requests, cash advances |

## Key Features

- **Separate Layout Context**: Employee portal has its own navigation sidebar distinct from the admin dashboard
- **Scoped Data Access**: Every query is filtered by `WHERE employee_id = :authenticatedEmployeeId`
- **My Attendance**: View attendance history, current clock-in status, late/overtime records
- **My Tasks**: View assigned tasks, update task status (Todo/In_Progress/Done), add comments
- **My Payslips**: View payslip history with period, gross, deductions, and net pay breakdown
- **My Profile**: View personal details; edit limited fields (phone, address, emergency contact)
- **My Disciplinary**: View NTEs, provide explanations, see disciplinary history
- **My Requests**: Submit leave requests, view leave balances, submit cash advance requests, track request statuses

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/self-service/attendance | Authenticated | Get own attendance history (paginated, filterable by date range) |
| GET | /api/self-service/attendance/today | Authenticated | Get today's clock-in/out status |
| GET | /api/self-service/tasks | Authenticated | Get tasks assigned to the current employee |
| PATCH | /api/self-service/tasks/:id/status | Authenticated | Update status of an assigned task |
| GET | /api/self-service/payslips | Authenticated | Get own payslip history |
| GET | /api/self-service/payslips/:id | Authenticated | Get detailed payslip breakdown |
| GET | /api/self-service/profile | Authenticated | Get own employee profile data |
| PATCH | /api/self-service/profile | Authenticated | Update limited profile fields (phone, address, emergency contact) |
| GET | /api/self-service/disciplinary | Authenticated | Get own disciplinary records |
| POST | /api/self-service/disciplinary/:id/response | Authenticated | Submit explanation response to an NTE |
| GET | /api/self-service/leave/balance | Authenticated | Get current leave balances by type |
| POST | /api/self-service/leave/request | Authenticated | Submit a new leave request |
| GET | /api/self-service/requests | Authenticated | Get all own pending/completed requests (leave, cash advance) |
| POST | /api/self-service/cash-advance/request | Authenticated | Submit a new cash advance request |
| GET | /api/self-service/expenses | Authenticated | Get own expense submissions |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Employee profile data (employees table)
- **03-schedule-management** -- Employee shift schedule data
- **04-attendance-system** -- Attendance logs for My Attendance page
- **06-leave-management** -- Leave balances and requests for My Requests
- **07-loans-management** -- Cash advance requests for My Requests
- **08-payroll-system** -- Payroll records for My Payslips
- **09-disciplinary** -- Disciplinary records for My Disciplinary
- **13-permissions-roles** -- isAuthenticated middleware for all endpoints
- **17-task-management** -- Tasks for My Tasks page
- **18-expense-management** -- Expenses for My Requests

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management with automatic refetching
- **Recharts** (v2.15.2) -- Personal attendance trend charts
- **date-fns** -- Date formatting across all My* pages

## Database Tables

This module does NOT own any tables. It reads from tables owned by other modules:

| Table | Source Module | Data Retrieved | Access |
|-------|-------------|----------------|--------|
| employees | 02-employee-management | Profile data for authenticated employee | Read, limited Update |
| attendance_logs | 04-attendance-system | Attendance records WHERE employee_id = self | Read only |
| tasks | 17-task-management | Tasks WHERE assigned_to_id = self | Read, status Update |
| payroll_records | 08-payroll-system | Payslips WHERE employee_id = self | Read only |
| disciplinary_records | 09-disciplinary | NTEs WHERE employee_id = self | Read, response Insert |
| leave_requests | 06-leave-management | Leave requests WHERE employee_id = self | Read, Insert |
| leave_allocations | 06-leave-management | Leave balances WHERE employee_id = self | Read only |
| cash_advances | 07-loans-management | Cash advances WHERE employee_id = self | Read, Insert |
| expenses | 18-expense-management | Expenses WHERE requester_id = self | Read, Insert |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Strict scoping | All queries append `WHERE employee_id = req.user.employeeId` -- never returns other employees' data |
| Profile edit limits | Employees can only edit: phone, address, city, province, zip_code, emergency_contact_* fields |
| Task status limits | Employees can only change task status to In_Progress or Done (cannot reopen or set Blocked) |
| Leave submission | Leave requests require sufficient balance and non-overlapping dates |
| NTE response | Employees can submit one explanation per NTE; subsequent submissions overwrite |
| Payslip access | Only released/approved payslips are visible (draft payrolls are hidden) |
| No deletion | Employees cannot delete any records through self-service |

## Scholaris Adaptation Notes

- **Student Portal**: Grades, class schedule, tuition balance, enrollment status, academic calendar
- **Parent Portal**: Child's grades, attendance, balance, teacher communications, payment history
- **Faculty Portal**: My classes, teaching load, class roster, grade submission, leave requests
- **Registrar Portal**: Enrollment queue, transcript requests, grade verification
- **Separate auth contexts**: Each portal type may need distinct navigation, landing page, and permission set
- **Mobile-first design**: Students and parents are more likely to access via mobile -- prioritize responsive layout
- **Offline access**: Consider PWA capabilities for grade viewing in areas with poor connectivity
- **Academic timeline**: Portal data is scoped to the current academic year/semester by default
