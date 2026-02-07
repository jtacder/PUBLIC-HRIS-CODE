# Module 01: Dashboard

## Purpose

Enterprise overview providing real-time statistics cards, attendance trends, payroll summaries, and quick-action buttons. Admin/HR users see full organizational analytics across all modules; Workers see a personal dashboard scoped to their own data. The dashboard serves as the landing page after login and the primary navigation hub for the application.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Dashboard.tsx | client/src/pages/Dashboard.tsx | Frontend | Admin/HR dashboard with 7 stat cards, quick action buttons, and chart widgets |
| dashboard.ts | server/routes/dashboard.ts | Backend | Dashboard statistics API aggregating data from multiple tables |

## Key Features

- **7 Stat Cards**: Total employees, today's attendance, active projects, pending tasks, payroll total, pending expenses, active NTEs (Notices to Explain)
- **Quick Action Buttons**: Clock-in, new employee, run payroll -- shortcuts to high-frequency operations
- **Role-Based Display**: Admin/HR sees organization-wide analytics; Worker role sees personal dashboard with own attendance, tasks, and payslips
- **Charts and Visualizations**: Attendance trends over time, payroll breakdown by category, using Recharts library
- **Real-Time Data**: TanStack Query handles automatic refetching and cache invalidation for live statistics
- **Responsive Layout**: Grid-based card layout adapts from 1 column (mobile) to 4 columns (desktop)

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/dashboard/statistics | ADMIN, HR | Aggregate counts: total employees, today's attendance, active projects, pending tasks, payroll, pending expenses, active NTEs |
| GET | /api/dashboard/metrics | ADMIN, HR | Time-series chart data for attendance trends and payroll breakdowns |
| GET | /api/dashboard/overview | ADMIN, HR | Summary overview with high-level KPIs |

## Dependencies

### Internal Module Dependencies
- **_shared/hooks/use-auth** -- Role detection for conditional rendering (isAdmin check)
- **_shared/components/ui/*** -- Card, Badge, Button, Skeleton from Shadcn/UI
- **02-employee-management** -- Employee count and status data
- **04-attendance-system** -- Today's attendance count
- **08-payroll-system** -- Payroll summary totals
- **16-project-management** -- Active project count
- **17-task-management** -- Pending task count
- **18-expense-management** -- Pending expense count
- **09-disciplinary** -- Active NTE count

### External Libraries
- **Recharts** (v2.15.2) -- Bar charts, line charts for data visualization
- **TanStack Query** (v5.60.5) -- Server state management and caching
- **Wouter** (v3.3.5) -- Navigation from quick action buttons
- **Framer Motion** (v11.13.1) -- Card entrance animations

## Database Tables

This module reads from (does not write to):

| Table | Data Retrieved |
|-------|---------------|
| employees | COUNT of active employees, role distribution |
| attendance_logs | COUNT of today's clock-in records |
| projects | COUNT of active projects |
| tasks | COUNT of tasks with status != "Done" |
| payroll_records | SUM of latest period's net pay |
| expenses | COUNT of expenses with status = "Pending" |
| disciplinary_records | COUNT of NTEs with status = "Issued" or "Explanation_Received" |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Role-based rendering | `user.role === "ADMIN" \|\| user.role === "HR"` sees full dashboard; others get personal dashboard |
| Statistics refresh | TanStack Query refetches on window focus and every 5 minutes |
| Quick actions visibility | Clock-in always visible; "New Employee" and "Run Payroll" only for ADMIN/HR |
| Zero-state handling | Cards show "0" with muted styling when no data exists |

## Scholaris Adaptation Notes

- **Split into role-specific dashboards**: Create separate Admin Dashboard, Registrar Dashboard, Faculty Dashboard, Parent Dashboard, and Student Dashboard components
- **Replace employee stats with academic stats**: Student enrollment count, faculty count, class sections, pending grades
- **Add academic calendar widget**: Upcoming school events, exam schedules, enrollment deadlines
- **Add class schedule summary**: Today's classes for faculty, next class for students
- **Replace payroll summary with tuition summary**: Total receivables, collected, outstanding balances
- **Add announcement ticker**: Scrolling announcements from the devotional/announcement module
- **Rename stat cards**: "Active Projects" becomes "Active Sections", "Pending Tasks" becomes "Pending Grades", "Active NTEs" becomes "Open Incident Reports"
