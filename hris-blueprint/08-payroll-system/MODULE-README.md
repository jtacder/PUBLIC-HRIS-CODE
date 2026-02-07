# Module 08: Payroll System

## Purpose

Philippine payroll computation engine with automated government deductions (SSS, PhilHealth, Pag-IBIG), TRAIN Law progressive tax calculation, overtime computation, and integrated deductions from leave, attendance, and cash advance modules. This is the most complex module in the HRIS system, serving as the financial backbone that synthesizes data from attendance, leave, loans, and HR settings into accurate payslip generation.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Payroll.tsx | client/src/pages/Payroll.tsx | Frontend | Payroll listing with period selection, status filters, batch actions (approve/release) |
| PayrollDetail.tsx | client/src/pages/PayrollDetail.tsx | Frontend | Individual payroll record detail with computation breakdown |
| Payslip.tsx | client/src/components/Payslip.tsx | Frontend | Printable payslip component with earnings, deductions, and net pay summary |
| payroll.ts | server/routes/payroll.ts | Backend | Payroll CRUD, generation, approval, and release endpoints |
| payroll-periods.ts | server/routes/payroll-periods.ts | Backend | Payroll period management (cutoff dates) |
| payslips.ts | server/routes/payslips.ts | Backend | Payslip generation and retrieval endpoints |
| payroll-calculator.ts | server/utils/payroll-calculator.ts | Backend | Core computation engine for salary, deductions, and net pay |

## Key Features

- **Automated Payroll Generation**: Batch-generate payroll records for all active employees within a payroll period
- **Philippine Government Deductions**: SSS, PhilHealth, Pag-IBIG computed per official 2024/2025 rate tables
- **TRAIN Law Tax Computation**: Progressive income tax using 6 brackets applied after mandatory contributions
- **Overtime Computation**: Regular OT (1.25x), Rest Day OT (1.30x), Holiday OT (2.00x) from gross minutes
- **Multi-Status Workflow**: DRAFT -> APPROVED -> RELEASED with role-based transition controls
- **Cash Advance Integration**: Auto-deduction of active cash advance installments
- **Leave Deduction**: Unpaid leave days deducted at daily rate
- **Late Deduction**: Accumulated late minutes converted to monetary deduction
- **Payslip Generation**: Printable payslips with complete earnings and deductions breakdown
- **Semi-Monthly Support**: Configurable payroll periods for semi-monthly (1st-15th, 16th-end) or monthly cutoffs

## Salary Computation Formula

### Basic Pay
```
If rate_type = 'daily':
    Basic Pay = Days Worked x Daily Rate

If rate_type = 'monthly':
    Daily Rate = Monthly Rate / 22 (standard working days)
    Basic Pay = Days Worked x Daily Rate
```

### Overtime Pay
```
OT Hours = Gross OT Minutes / 60  (before lunch deduction)
Regular OT     = OT Hours x Hourly Rate x 1.25
Rest Day OT    = OT Hours x Hourly Rate x 1.30
Holiday OT     = OT Hours x Hourly Rate x 2.00

Hourly Rate = Daily Rate / 8
```

### Government Deductions (Semi-Monthly Basis)

| Contribution | Formula | Employee Share Per Cutoff | Ceiling |
|-------------|---------|-------------------------|---------|
| SSS | 57 salary brackets (RA 11199) | Bracket-based, max P675/cutoff | MSC P30,000 |
| PhilHealth | 5% of basic salary | 2.5% employee share, max P1,250/cutoff | P100,000 monthly salary cap |
| Pag-IBIG | Salary <= P1,500: 1%; > P1,500: 2% | Max P50/cutoff (at P5,000 MSC cap) | MSC P5,000 |

### TRAIN Law Income Tax (Annual Brackets, Applied Monthly)

| Bracket | Annual Taxable Income | Tax Rate |
|---------|----------------------|----------|
| 1 | P0 - P250,000 | 0% |
| 2 | P250,001 - P400,000 | 15% of excess over P250,000 |
| 3 | P400,001 - P800,000 | P22,500 + 20% of excess over P400,000 |
| 4 | P800,001 - P2,000,000 | P102,500 + 25% of excess over P800,000 |
| 5 | P2,000,001 - P8,000,000 | P402,500 + 30% of excess over P2,000,000 |
| 6 | Over P8,000,000 | P2,202,500 + 35% of excess over P8,000,000 |

### Net Pay Formula
```
Gross Pay = Basic Pay + Overtime Pay + Allowances

Total Deductions = SSS + PhilHealth + Pag-IBIG + Income Tax
                 + Cash Advance Deduction
                 + Late Deduction
                 + Unpaid Leave Deduction

Net Pay = Gross Pay - Total Deductions
```

## Workflow State Machine

```
    HR generates payroll
           |
           v
        [DRAFT]
        /     \
  HR approves  HR deletes
      /            \
     v              v
  [APPROVED]    (deleted)
      |
  HR releases
      |
      v
  [RELEASED]
```

| Transition | Actor | Side Effects |
|-----------|-------|-------------|
| -> DRAFT | HR, ADMIN | Payroll records computed for all active employees in the period |
| DRAFT -> DRAFT | HR, ADMIN | Re-compute (regenerate) to pick up attendance/leave changes |
| DRAFT -> APPROVED | HR, ADMIN | Cash advance balances updated (deductions applied), records locked |
| DRAFT -> (deleted) | HR, ADMIN | Delete draft payroll records (no financial impact) |
| APPROVED -> RELEASED | ADMIN | Final state; payslips generated and available to employees |

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/payroll | ADMIN, HR | List payroll records with period and status filters |
| POST | /api/payroll/generate | ADMIN, HR | Generate payroll for a specific period (creates DRAFT records) |
| GET | /api/payroll/:id | All authenticated | Get a single payroll record with full computation breakdown |
| PATCH | /api/payroll/:id/approve | ADMIN, HR | Approve a DRAFT payroll record |
| PATCH | /api/payroll/:id/release | ADMIN | Release an APPROVED payroll record |
| DELETE | /api/payroll/:id | ADMIN, HR | Delete a DRAFT payroll record |
| GET | /api/payroll/summary | ADMIN, HR | Aggregate payroll summary for a period (total gross, deductions, net) |
| GET | /api/payroll-periods | ADMIN, HR | List payroll periods (cutoff definitions) |
| GET | /api/payslips | All authenticated | List payslips (filtered by employee for non-admin roles) |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Employee salary data (daily_rate, monthly_rate, rate_type)
- **04-attendance-system** -- Days worked, overtime minutes, late minutes per period
- **06-leave-management** -- Approved unpaid leaves within the payroll period
- **07-loans-management** -- Active cash advance deductions
- **10-hr-settings** -- Payroll cutoff configuration, holiday calendar, contribution rates
- **_shared/hooks/use-auth** -- Role detection for approve/release buttons
- **_shared/components/ui/*** -- Card, Table, Badge, Button, Dialog, Select

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for payroll data
- **date-fns** (v4.1.0) -- Date arithmetic for period calculations
- **Recharts** (v2.15.2) -- Payroll summary charts and breakdowns

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| payroll_records | CRUD | id, employee_id, payroll_period_id, basic_pay, overtime_pay, gross_pay, sss_deduction, philhealth_deduction, pagibig_deduction, tax_deduction, cash_advance_deduction, late_deduction, unpaid_leave_deduction, total_deductions, net_pay, days_worked, ot_hours, late_minutes, status |
| payroll_periods | CRUD | id, name, start_date, end_date, cutoff_type, status |
| payslips | Create, Read | id, payroll_record_id, employee_id, payslip_data (JSONB), generated_at |
| employees | Read | daily_rate, monthly_rate, rate_type |
| attendance_logs | Read | days_worked, ot_minutes, late_minutes for the period |
| leave_requests | Read | approved unpaid leaves within period |
| cash_advances | Read, Update | active deductions applied during payroll |
| holidays | Read | holiday dates for OT multiplier determination |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Working Days Standard | 22 working days per month used for monthly-to-daily rate conversion |
| OT Minute Source | Overtime calculated from GROSS minutes (clock-in to clock-out, before lunch deduction) |
| Semi-Monthly Deductions | SSS, PhilHealth, Pag-IBIG deducted per cutoff (half of monthly amount) |
| Tax Annualization | Monthly taxable income annualized, tax computed, then divided by 12 for monthly withholding |
| DRAFT Editable | DRAFT payroll records can be regenerated, edited, or deleted |
| APPROVED Locked | Approved records are immutable; cash advance deductions are applied at this stage |
| RELEASED Final | Released records generate payslips accessible by employees |
| Employee Inclusion | Only Active and Probationary employees are included in payroll generation |
| Decimal Precision | All monetary fields use DECIMAL(10,2) for peso-centavo accuracy |

## Known Missing Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Night Differential | 10% premium for work between 10:00 PM - 6:00 AM (Labor Code Art. 86) | High |
| 13th Month Pay | Mandatory computation: total basic salary / 12 (PD 851) | High |
| Holiday Pay | Regular/Special holiday base pay (currently only via OT multiplier) | Medium |
| De Minimis Benefits | Non-taxable allowances (rice subsidy, clothing, etc.) | Low |
| Payroll Adjustments | Post-release corrections and adjustments | Medium |
| Year-End Tax Annualization | Annual reconciliation of monthly tax withholdings | High |

## SSS Contribution Table Reference (2024 - RA 11199)

The SSS contribution uses a bracket-based lookup table with 57 salary ranges. Key reference points:

| Monthly Salary Range | MSC (Monthly Salary Credit) | Total Contribution | Employee Share (semi-monthly) |
|---------------------|----------------------------|-------------------|------------------------------|
| Below P4,000 | P4,000 | P570 | P142.50 |
| P4,000 - P4,249.99 | P4,000 | P570 | P142.50 |
| P24,750 - P25,249.99 | P25,000 | P3,550 | P500.00 |
| P29,750 - P30,249.99 | P30,000 | P4,350 | P675.00 |
| P30,250 and above | P30,000 | P4,350 | P675.00 |

## Scholaris Adaptation Notes

- **Faculty Payroll**: Same computation engine; add teaching load allowance, advisory class stipend
- **Substitute Pay**: Pro-rated daily rate for substitute teachers covering leave absences
- **Tuition Fee Discount**: Faculty children tuition discount as a non-cash benefit tracked alongside payroll
- **School Year Periods**: Payroll periods may align with school year (June-March) rather than calendar year
- **Government Subsidy Tracking**: Track DepEd/CHED subsidy allocations separate from school-funded salary
- **Part-Time Faculty Pay**: Hourly rate x teaching hours instead of daily/monthly rate
- **Summer Pay**: Different computation for summer months (April-May) when there are no classes
