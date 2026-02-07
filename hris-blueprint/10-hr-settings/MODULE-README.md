# Module 10: HR Settings

## Purpose

System-wide configuration hub providing a 4-tab settings page for managing payroll cutoff periods, government contribution rate display, leave type definitions, and holiday calendar management. This module is the administrative backbone that controls parameters consumed by the Payroll, Leave, and Attendance modules. Only ADMIN and HR users should have access to modify settings, though a known authorization issue in the original code left all mutation endpoints without `hasRole` middleware.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| HRSettings.tsx | client/src/pages/HRSettings.tsx | Frontend | 4-tab settings page with Payroll Cutoffs, Contributions, Leave Types, and Holidays tabs |
| hr-settings.ts | server/routes/hr-settings.ts | Backend | Settings CRUD endpoints for payroll cutoffs, leave types, holidays, and company info |

## Key Features

- **4-Tab Settings Interface**: Organized configuration across Payroll Cutoffs, Contributions, Leave Types, and Holidays
- **Payroll Cutoff Configuration**: Define semi-monthly or monthly payroll periods with start/end dates and pay dates
- **Government Contribution Display**: Read-only view of current SSS, PhilHealth, Pag-IBIG rate tables and OT multipliers
- **Leave Type Management**: CRUD operations for leave types with annual allocations, accrual modes, and paid/unpaid flags
- **Holiday Calendar**: Manage regular holidays and special non-working holidays with date and type classification
- **Company Information**: Basic company profile settings (name, address, TIN, etc.) used in payslip headers

## Tab Details

### Tab 1: Payroll Cutoffs

| Setting | Description | Default |
|---------|-------------|---------|
| Cutoff Type | Semi-monthly or Monthly | Semi-monthly |
| First Half Period | 1st - 15th of month | 1-15 |
| Second Half Period | 16th - end of month | 16-30/31 |
| First Half Pay Date | Pay date for 1st-15th period | 20th |
| Second Half Pay Date | Pay date for 16th-end period | 5th of next month |

### Tab 2: Contributions (Read-Only Display)

| Section | Contents |
|---------|----------|
| SSS | Current SSS contribution table with salary brackets, MSC, and employee/employer shares |
| PhilHealth | Premium rate (5%), salary floor (P10,000), salary ceiling (P100,000), max contribution |
| Pag-IBIG | Rate tiers (1%/2%), MSC cap (P5,000), max monthly contribution (P100) |
| Overtime | Multiplier rates: Regular (1.25x), Rest Day (1.30x), Holiday (2.00x) |

### Tab 3: Leave Types

| Column | Description |
|--------|-------------|
| Name | Leave type name (e.g., Sick Leave, Vacation Leave) |
| Days Per Year | Annual allocation of leave days |
| Is Paid | Whether leaves of this type are paid or deducted from salary |
| Accrual Mode | Annual (full on Day 1) or Monthly (gradual pro-rating) |
| Description | Additional details about the leave type |
| Active | Whether the leave type is currently active |

### Tab 4: Holidays

| Column | Description |
|--------|-------------|
| Name | Holiday name (e.g., New Year's Day, Independence Day) |
| Date | Holiday date |
| Type | Regular Holiday or Special Non-Working Holiday |
| Recurring | Whether the holiday repeats annually on the same date |

## Holiday Types (Philippine Classification)

| Type | Payroll Impact | Examples |
|------|---------------|----------|
| Regular Holiday | 200% pay for work performed; 100% pay even if unworked (for monthly-rated) | New Year's Day, Araw ng Kagitingan, Maundy Thursday, Good Friday, Labor Day, Independence Day, National Heroes Day, Bonifacio Day, Christmas Day, Rizal Day |
| Special Non-Working Holiday | 130% pay for work performed; no pay if unworked (for daily-rated) | Ninoy Aquino Day, All Saints Day, Christmas Eve, Last Day of the Year, EDSA People Power Anniversary |

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/hr-settings/payroll-cutoffs | ADMIN, HR | List payroll cutoff period configurations |
| POST | /api/hr-settings/payroll-cutoffs | ADMIN, HR | Create a new payroll cutoff period |
| PATCH | /api/hr-settings/payroll-cutoffs/:id | ADMIN, HR | Update a payroll cutoff period |
| DELETE | /api/hr-settings/payroll-cutoffs/:id | ADMIN, HR | Delete a payroll cutoff period |
| GET | /api/hr-settings/leave-types | ADMIN, HR | List all leave types (active and inactive) |
| POST | /api/hr-settings/leave-types | ADMIN, HR | Create a new leave type |
| PATCH | /api/hr-settings/leave-types/:id | ADMIN, HR | Update a leave type |
| DELETE | /api/hr-settings/leave-types/:id | ADMIN, HR | Deactivate a leave type (soft delete) |
| GET | /api/hr-settings/holidays | ADMIN, HR | List all holidays |
| POST | /api/hr-settings/holidays | ADMIN, HR | Create a new holiday |
| PATCH | /api/hr-settings/holidays/:id | ADMIN, HR | Update a holiday |
| DELETE | /api/hr-settings/holidays/:id | ADMIN, HR | Delete a holiday |
| GET | /api/hr-settings/company-info | ADMIN, HR | Get company information |
| PATCH | /api/hr-settings/company-info | ADMIN | Update company information |

## Dependencies

### Internal Module Dependencies
- **06-leave-management** -- Leave types defined here are consumed by the Leave Management module
- **08-payroll-system** -- Payroll cutoff periods and holiday calendar consumed by Payroll computation
- **04-attendance-system** -- Holiday calendar used for attendance validation and OT multiplier determination
- **_shared/hooks/use-auth** -- Role detection for admin-only features
- **_shared/components/ui/*** -- Tabs, Card, Table, Button, Dialog, Form, Input, Select, Calendar

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for settings data
- **React Hook Form** (v7.55.0) -- Settings form management
- **Zod** (v3.24.2) -- Input validation schemas
- **date-fns** (v4.1.0) -- Date formatting for holiday calendar

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| payroll_periods | CRUD | id, name, start_date, end_date, cutoff_type, pay_date, status (shared with Payroll module) |
| leave_types | CRUD | id, name, days_per_year, is_paid, accrual_mode, description, is_active (shared with Leave module) |
| holidays | CRUD | id, name, date, type, is_recurring, year |
| company_settings | Read, Update | id, company_name, address, tin, sss_employer_no, philhealth_employer_no, pagibig_employer_no, logo_url |
| sss_contribution_table | Read | Bracket lookup table (shared with Payroll module, read-only from Settings) |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Authorization Gap | Original code lacked `hasRole('ADMIN', 'HR')` middleware on mutation endpoints -- MUST be fixed |
| Payroll Period Overlap | Cannot create payroll periods with overlapping date ranges of the same cutoff type |
| Leave Type Soft Delete | Deactivating a leave type sets `is_active = false`; existing allocations are preserved |
| Leave Type Name Unique | Leave type names must be unique |
| Holiday Date Unique | No duplicate holidays on the same date |
| Recurring Holidays | Recurring holidays auto-generate for each new year |
| Company Info Singleton | Only one company_settings row exists (upsert pattern) |
| SSS Table Read-Only | SSS contribution table is seeded from official gazette data; not editable through the UI |
| Contribution Display | PhilHealth and Pag-IBIG rates are displayed as computed values, not stored as configurable settings |

## Known Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing hasRole middleware | High | All POST/PATCH/DELETE endpoints in hr-settings.ts lack authorization middleware. Any authenticated user can modify settings. |
| No validation on cutoff dates | Medium | Cutoff period start/end dates are not validated against each other (start could be after end) |
| Holiday recurrence | Low | Recurring holiday generation is not automated; relies on manual creation each year |

## Scholaris Adaptation Notes

- **Academic Year Configuration**: Add school year settings (start/end dates, grading periods, enrollment windows)
- **Grading Period Setup**: Define grading periods (Prelim, Midterm, Semi-Final, Final) with date ranges
- **Tuition Rate Configuration**: Fee structures per grade level, payment schedules, discount tiers
- **Section/Class Configuration**: Section management (section name, grade level, adviser, max capacity)
- **Subject Configuration**: Subject master list with units, prerequisites, and teacher assignments
- **School Calendar**: Replace holiday management with full academic calendar (events, suspensions, special activities)
- **Rename Payroll Cutoffs**: May keep semi-monthly for faculty payroll; add "Tuition Due Dates" for student billing
- **Add DepEd/CHED compliance settings**: School ID, recognition number, accreditation level
