# Module 06: Leave Management

## Purpose

Complete leave management system covering leave type configuration, request submission with approval workflows, balance tracking with two accrual modes, and payroll integration for unpaid leave deductions. Employees submit leave requests that flow through a Pending/Approved/Rejected/Cancelled workflow managed by HR and Admin users. Leave balances are automatically allocated per year and decremented upon approval.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| LeaveRequests.tsx | client/src/pages/LeaveRequests.tsx | Frontend | Leave request listing with status filters, balance cards, and request history |
| LeaveForm.tsx | client/src/components/LeaveForm.tsx | Frontend | Leave request submission form with date picker, leave type selector, and balance validation |
| leave-requests.ts | server/routes/leave-requests.ts | Backend | Leave request CRUD, approval/rejection/cancellation endpoints |

## Key Features

- **Leave Type Configuration**: Configurable leave types with annual day allocations, paid/unpaid flag, and accrual mode
- **Two Accrual Modes**: Annual (full allocation on Day 1 of year) or Monthly (gradual: `totalDays / 12 * completedMonths`)
- **Leave Request Workflow**: Pending -> Approved/Rejected/Cancelled with full audit trail
- **Balance Tracking**: Real-time balance display showing total, used, and remaining days per leave type
- **Half-Day Support**: Decimal day counts (e.g., 0.5) for half-day leave requests
- **Overlap Detection**: Server-side validation prevents overlapping leave requests for the same employee
- **Payroll Integration**: Unpaid leaves (isPaid=false) are deducted at the employee's daily rate during payroll computation
- **Pro-Rate for New Hires**: Monthly accrual mode automatically pro-rates leave for employees who join mid-year
- **Self-Service Cancellation**: Employees can cancel their own pending requests; approved requests cannot be cancelled

## Leave Types

| Type | Default Days/Year | Is Paid | Accrual Mode | Description |
|------|-------------------|---------|-------------|-------------|
| Sick Leave | 15 | Yes | Annual | Medical-related absences with or without medical certificate |
| Vacation Leave | 15 | Yes | Monthly | Planned time off, requires advance request |
| Bereavement Leave | 3 | Yes | Annual | Death of immediate family member |
| Maternity Leave | 105 | Yes | Annual | RA 11210 Expanded Maternity Leave (105 days, extendable by 30 for solo parents) |
| Paternity Leave | 7 | Yes | Annual | RA 8187 Paternity Leave (7 days for married male employees) |
| Emergency Leave | 3 | Yes | Annual | Unforeseen emergencies requiring immediate absence |

## Workflow State Machine

```
                 Employee submits
                      |
                      v
                  [Pending]
                 /    |     \
         HR approves  |   Employee cancels
               /      |         \
              v       |          v
         [Approved]   |     [Cancelled]
                      |
               HR rejects
                      |
                      v
                 [Rejected]
```

| Transition | Actor | Side Effects |
|-----------|-------|-------------|
| -> Pending | Employee | Leave request created, no balance impact yet |
| Pending -> Approved | HR, ADMIN | `leave_allocations.used_days` incremented, `remaining_days` decremented |
| Pending -> Rejected | HR, ADMIN | No balance impact; rejection_reason required |
| Pending -> Cancelled | Employee (own only) | No balance impact; request marked inactive |
| Approved -> (none) | -- | Approved requests cannot be changed (immutable) |

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/leave-requests | All authenticated | List leave requests (filtered by employee for non-admin roles) |
| POST | /api/leave-requests | All authenticated | Submit a new leave request |
| GET | /api/leave-requests/:id | All authenticated | Get a single leave request by ID |
| PATCH | /api/leave-requests/:id/approve | ADMIN, HR | Approve a pending leave request |
| PATCH | /api/leave-requests/:id/reject | ADMIN, HR | Reject a pending leave request (requires reason) |
| PATCH | /api/leave-requests/:id/cancel | All authenticated | Cancel own pending leave request |
| GET | /api/leave-types | All authenticated | List all active leave types |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Employee records for leave request association and daily rate lookup
- **08-payroll-system** -- Unpaid leave deductions integrated into payroll computation
- **10-hr-settings** -- Leave type configuration managed in HR Settings module
- **_shared/hooks/use-auth** -- Role detection for showing approve/reject buttons
- **_shared/components/ui/*** -- Card, Table, Badge, Button, Calendar, Dialog, Select

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for leave request data
- **React Hook Form** (v7.55.0) -- Leave request form management
- **Zod** (v3.24.2) -- Input validation for date ranges and day counts
- **date-fns** (v4.1.0) -- Date arithmetic for day count calculation and overlap detection

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| leave_types | Read (managed by HR Settings) | id, name, days_per_year, is_paid, accrual_mode, description, is_active |
| leave_requests | CRUD | id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status, approved_by, approved_at, rejection_reason |
| leave_allocations | Read, Update | id, employee_id, leave_type_id, year, total_days, used_days, remaining_days |
| employees | Read | daily_rate (for unpaid leave deduction calculation) |

### Key Database Indexes
- `idx_leave_request_employee` -- Fast lookup of an employee's leave requests
- `idx_leave_request_status` -- Filter requests by status (Pending queue for HR)
- `idx_leave_request_dates` -- Date range queries for overlap detection
- `idx_leave_request_employee_status` -- Composite index for employee-specific status filtering

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Balance Check | Request rejected if `days_count > remaining_days` for the leave type and year |
| Overlap Prevention | No two approved/pending requests for the same employee can have overlapping date ranges |
| Day Count Calculation | `days_count` must equal the number of business days between start_date and end_date (weekends excluded unless shift includes weekends) |
| Minimum Days | `days_count` must be >= 0.5 (half day minimum) |
| Date Validation | `start_date` must be <= `end_date`; start_date must be today or in the future for new requests |
| Cancellation Window | Only pending requests can be cancelled; only by the requesting employee |
| Rejection Requires Reason | `rejection_reason` is required when rejecting a leave request |
| Monthly Accrual Formula | `available_days = (days_per_year / 12) * completed_months_in_year` (rounded to 2 decimal places) |
| Annual Accrual | Full `days_per_year` available from January 1 regardless of hire date within the year |
| Payroll Deduction | For unpaid leaves: `deduction = days_count * employee.daily_rate` applied during payroll computation |

## Scholaris Adaptation Notes

- **Faculty Leave**: Same leave types apply to school faculty/staff; add "Study Leave" type for advanced degree pursuits
- **Student Absence Request**: Separate workflow where parents/guardians submit absence notices; no approval required, just acknowledgment
- **Academic Calendar Integration**: Leave requests validated against academic calendar -- certain periods (exams, enrollment) may restrict faculty leave
- **Substitute Teacher Assignment**: When faculty leave is approved, prompt assignment of substitute teacher for affected class sections
- **Add school-year scoping**: Leave allocations tied to school year (June-March) instead of calendar year
- **Leave types expand**: Add Service Incentive Leave (for support staff), Solo Parent Leave (RA 8972), VAWC Leave (RA 9262)
