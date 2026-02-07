# Module 07: Loans Management (Cash Advances)

## Purpose

Cash advance management system with approval workflows, scheduled payroll deductions, and automatic balance tracking. Employees request cash advances that flow through a multi-step approval and disbursement pipeline. Once disbursed, repayments are automatically deducted from the employee's payroll at a fixed per-cutoff amount until the balance reaches zero, at which point the advance is marked as fully paid.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| CashAdvances.tsx | client/src/pages/CashAdvances.tsx | Frontend | Cash advance listing with status filters, running balance display, and action buttons |
| CashAdvanceForm.tsx | client/src/components/CashAdvanceForm.tsx | Frontend | Cash advance request form with amount, purpose, and deduction per cutoff fields |
| cash-advances.ts | server/routes/cash-advances.ts | Backend | Cash advance CRUD, approval, disbursement, and rejection endpoints |

## Key Features

- **Cash Advance Request**: Employees submit requests specifying amount, purpose, and preferred deduction per cutoff
- **Multi-Step Workflow**: Pending -> Approved -> Disbursed -> Fully_Paid (or Rejected at any point before disbursement)
- **Automatic Payroll Deduction**: Deductions applied each payroll cutoff: `min(deductionPerCutoff, remainingBalance)`
- **Balance Tracking**: Real-time remaining balance updated after each payroll deduction
- **Auto-Completion**: Status automatically transitions to `Fully_Paid` when `remaining_balance` reaches zero
- **Deduction History**: Full audit trail of every payroll deduction linked to the cash advance
- **Validation**: `deduction_per_cutoff` cannot exceed `amount` (prevents over-deduction in a single period)
- **Multiple Active Advances**: An employee can have multiple active (Disbursed) cash advances simultaneously

## Workflow State Machine

```
                 Employee submits
                      |
                      v
                  [Pending]
                 /         \
          HR approves    HR rejects
               /              \
              v                v
         [Approved]       [Rejected]
              |
        HR disburses
              |
              v
        [Disbursed]
              |
     Payroll deductions (auto)
              |
     remaining_balance = 0
              |
              v
        [Fully_Paid]
```

| Transition | Actor | Side Effects |
|-----------|-------|-------------|
| -> Pending | Employee | Request created; no financial impact |
| Pending -> Approved | HR, ADMIN | Request approved; awaiting disbursement |
| Pending -> Rejected | HR, ADMIN | Request rejected; rejection_reason required |
| Approved -> Disbursed | HR, ADMIN | Funds released; remaining_balance set to amount; disbursed_at timestamped |
| Disbursed -> Fully_Paid | System (auto) | Triggered when remaining_balance = 0 after payroll deduction |

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/cash-advances | All authenticated | List cash advances (filtered by employee for non-admin roles) |
| POST | /api/cash-advances | All authenticated | Submit a new cash advance request |
| GET | /api/cash-advances/:id | All authenticated | Get a single cash advance by ID with deduction history |
| PATCH | /api/cash-advances/:id/approve | ADMIN, HR | Approve a pending cash advance |
| PATCH | /api/cash-advances/:id/disburse | ADMIN, HR | Mark an approved cash advance as disbursed |
| PATCH | /api/cash-advances/:id/reject | ADMIN, HR | Reject a pending cash advance (requires reason) |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Employee records for cash advance association
- **08-payroll-system** -- Payroll computation applies cash advance deductions automatically
- **_shared/hooks/use-auth** -- Role detection for approve/disburse/reject buttons
- **_shared/components/ui/*** -- Card, Table, Badge, Button, Dialog, Input

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for cash advance data
- **React Hook Form** (v7.55.0) -- Cash advance request form management
- **Zod** (v3.24.2) -- Amount and deduction validation schemas

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| cash_advances | CRUD | id, employee_id, amount, purpose, deduction_per_cutoff, remaining_balance, status, approved_by, approved_at, disbursed_at, rejection_reason |
| cash_advance_deductions | Create, Read | id, cash_advance_id, payroll_record_id, amount, deduction_date |
| payroll_records | Read (linked) | id (referenced by cash_advance_deductions for audit trail) |

### Key Database Indexes
- `idx_cash_advance_employee` -- Fast lookup of an employee's cash advances
- `idx_cash_advance_status` -- Filter by status (Pending queue for HR)
- `idx_cash_advance_deductions_advance` -- Deduction history per cash advance
- `idx_cash_advance_deductions_payroll` -- Deductions per payroll record

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Deduction Cap | `deduction_per_cutoff` must be > 0 and <= `amount` |
| Minimum Amount | Cash advance `amount` must be > 0 |
| Deduction Formula | Each payroll: `deduction = MIN(deduction_per_cutoff, remaining_balance)` |
| Balance Update | After deduction: `remaining_balance = remaining_balance - deduction_amount` |
| Auto-Completion | When `remaining_balance` reaches 0, status auto-transitions to `Fully_Paid` |
| Rejection Requires Reason | `rejection_reason` is required when rejecting a cash advance |
| Initial Balance | On disbursement, `remaining_balance` is set to `amount` |
| No Edit After Disbursement | Once disbursed, amount and deduction_per_cutoff are immutable |
| Payroll Integration | Only `Disbursed` status cash advances are included in payroll deductions |
| Multiple Advances | Employee may have multiple `Disbursed` advances; total deduction per cutoff = sum of all active deductions |

## Payroll Integration Detail

During payroll computation, for each employee:

1. Query all cash advances with `status = 'Disbursed'` and `remaining_balance > 0`
2. For each active advance: `deduction = MIN(deduction_per_cutoff, remaining_balance)`
3. Sum all deductions into `total_cash_advance_deduction`
4. Subtract from gross pay: `net_pay = gross - (contributions + tax + cash_advance_deduction + ...)`
5. Create `cash_advance_deductions` record linking to the payroll record
6. Update `remaining_balance` on the cash advance
7. If `remaining_balance = 0`, auto-update status to `Fully_Paid`

## Scholaris Adaptation Notes

- **Faculty/Staff Loans**: Same cash advance logic applies to school faculty and staff
- **Eligibility Rules**: May add tenure-based eligibility (e.g., must be regular employee for 6+ months)
- **Loan Limits**: Add configurable maximum loan amount based on employee monthly salary (e.g., max 2x monthly rate)
- **Interest Support**: For school cooperatives, add optional interest rate field and amortization schedule
- **Add loan types**: Salary Loan, Emergency Loan, Multi-Purpose Loan with different terms per type
- **Guarantor/Co-maker**: For larger loan amounts, add co-maker/guarantor reference to another employee
