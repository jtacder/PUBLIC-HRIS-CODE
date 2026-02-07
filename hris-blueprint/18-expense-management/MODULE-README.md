# Module 18: Expense Management

## Purpose

Expense submission and approval workflow with receipt tracking. Employees submit expenses linked to projects, which go through an approval chain before reimbursement. Supports expense categorization and project-level cost tracking.

## File Inventory

| File | Original Path | Description |
|------|--------------|-------------|
| expenses.ts | server/routes/expenses.ts | Expense API routes |
| Expenses page | client/src/pages/ (shared UI) | Expense list and form interface |

## Key Features

- Submit expenses with amount, category, description, and receipt upload
- Link expenses to projects for cost tracking
- Approval workflow: Pending → Approved/Rejected → Reimbursed
- Receipt URL attachment support
- Project budget impact tracking (actual_cost on projects table)
- Admin/HR approval required for all expenses
- Expense approval history tracking

## API Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/expenses | List all expenses (with optional project/status filters) |
| POST | /api/expenses | Submit new expense |
| GET | /api/expenses/:id | Get expense details |
| PATCH | /api/expenses/:id/approve | Approve expense |
| PATCH | /api/expenses/:id/reject | Reject expense |
| PATCH | /api/expenses/:id/reimburse | Mark as reimbursed |

## Business Rules

| Condition | Actor | Outcome |
|-----------|-------|---------|
| Submit expense | Any employee | status = "Pending" |
| Approve expense | HR/ADMIN | status = "Approved" |
| Reject expense | HR/ADMIN | status = "Rejected", requires notes |
| Mark reimbursed | HR/ADMIN | status = "Reimbursed", reimbursed_at set |
| View all expenses | HR/ADMIN | Full access |
| View own expenses | Employee | Filtered by requester_id |

## Dependencies

- 02-employee-management (requester identification)
- 16-project-management (project cost tracking)
- 12-audit-trail (action logging)

## Database Tables

- `expenses` — Expense records with category, amount, receipt, approval status
- `expense_approvals` — Approval chain tracking

## Known Issues (from audit)

- Unused `query` variable in `getExpenses` method (`storage.ts:599`)
- Should use batch queries for listing with filters

## Scholaris Adaptation

- Same approval workflow applies to school expenses
- Add department-level budget tracking
- Categories: Supplies, Equipment, Facilities, Events, Travel
- Add budget limit enforcement per department
- Link to school fiscal year instead of project
