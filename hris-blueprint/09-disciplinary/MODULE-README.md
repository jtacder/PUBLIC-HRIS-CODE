# Module 09: Disciplinary

## Purpose

Notice to Explain (NTE) workflow for employee discipline management following Philippine labor law due process requirements. HR/Admin issues NTEs for alleged violations, employees are given a 5-day window to submit written explanations, and HR/Admin resolves cases with appropriate sanctions. This module ensures compliance with the twin-notice rule required under Philippine labor jurisprudence and provides a complete audit trail of all disciplinary actions.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Disciplinary.tsx | client/src/pages/Disciplinary.tsx | Frontend | Disciplinary records listing with status filters, violation search, and quick actions |
| DisciplinaryDetail.tsx | client/src/pages/DisciplinaryDetail.tsx | Frontend | Detailed NTE view with timeline, explanation submission, and resolution panel |
| disciplinary.ts | server/routes/disciplinary.ts | Backend | Disciplinary record CRUD, explanation submission, and resolution endpoints |

## Key Features

- **NTE Issuance**: HR/Admin creates NTEs specifying the violation, date of incident, and supporting details
- **5-Day Response Deadline**: Employees have 5 calendar days from NTE issuance to submit a written explanation
- **Explanation Submission**: Employees submit explanations through the system with optional supporting document attachments
- **Resolution with Sanctions**: HR/Admin resolves cases by selecting a sanction level and providing resolution notes
- **Sanction Levels**: Graduated discipline -- verbal warning, written warning, suspension, termination
- **Status Workflow**: Issued -> Explanation_Received -> Resolved with clear state transitions
- **Deadline Tracking**: Visual indicators for approaching and overdue response deadlines
- **201 File Integration**: Disciplinary history appears in the employee's 201 File Disciplinary History tab
- **Self-Service View**: Employees can view their own NTEs and submit explanations; they cannot view others' records

## Workflow State Machine

```
         HR/Admin issues NTE
                |
                v
           [Issued]
           (5-day deadline starts)
                |
       Employee submits explanation
                |
                v
     [Explanation_Received]
                |
       HR/Admin resolves
                |
                v
          [Resolved]
          (sanction applied)
```

| Transition | Actor | Side Effects |
|-----------|-------|-------------|
| -> Issued | HR, ADMIN | NTE created; response_deadline set to issue_date + 5 days |
| Issued -> Explanation_Received | Employee (own NTE only) | Explanation text and optional attachment saved |
| Explanation_Received -> Resolved | HR, ADMIN | Sanction selected; resolution_notes recorded; resolved_at timestamped |
| Issued -> Resolved | HR, ADMIN | HR can resolve without explanation (e.g., if deadline passed without response) |

## Sanction Levels

| Level | Value | Description | Typical Use |
|-------|-------|-------------|------------|
| 1 | verbal_warning | Verbal warning documented in the system | First minor offense |
| 2 | written_warning | Formal written warning placed in 201 file | Repeated minor offense or moderate offense |
| 3 | suspension | Temporary suspension from work (unpaid) | Serious offense or repeated warnings |
| 4 | termination | Dismissal from employment | Grave misconduct or repeated serious offenses |

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/disciplinary | All authenticated | List disciplinary records (filtered by employee for non-admin roles) |
| POST | /api/disciplinary | ADMIN, HR | Create a new NTE (disciplinary record) |
| GET | /api/disciplinary/:id | All authenticated | Get a single disciplinary record by ID with full history |
| PATCH | /api/disciplinary/:id | ADMIN, HR | Update NTE details (only in Issued status) |
| POST | /api/disciplinary/:id/explanation | All authenticated | Submit explanation for own NTE (employee self-service) |
| PATCH | /api/disciplinary/:id/resolve | ADMIN, HR | Resolve an NTE with sanction and resolution notes |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Employee records for NTE association and 201 file integration
- **05-201-files** -- Disciplinary history displayed in the employee's 201 file
- **01-dashboard** -- Active NTE count shown on the dashboard statistics
- **_shared/hooks/use-auth** -- Role detection for issue/resolve capabilities vs. explanation submission
- **_shared/components/ui/*** -- Card, Table, Badge, Button, Dialog, Textarea, Timeline

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for disciplinary record data
- **React Hook Form** (v7.55.0) -- NTE creation and explanation submission forms
- **Zod** (v3.24.2) -- Input validation schemas
- **date-fns** (v4.1.0) -- Deadline calculation and relative time display

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| disciplinary_records | CRUD | id, employee_id, violation, violation_date, description, status, sanction, response_deadline, resolution_notes, resolved_at, resolved_by, issued_by, issued_at |
| disciplinary_explanations | Create, Read | id, disciplinary_record_id, explanation_text, attachment_url, submitted_at |
| disciplinary_sanctions | Read | id, disciplinary_record_id, sanction_type, effective_date, end_date, notes |
| employees | Read | id, first_name, last_name (for display in NTE records) |

### Violation Categories

| Category | Examples |
|----------|---------|
| Attendance | Habitual tardiness, unauthorized absence, AWOL |
| Conduct | Insubordination, disrespectful behavior, harassment |
| Performance | Failure to meet targets, negligence, quality issues |
| Policy | Dress code violation, unauthorized use of resources |
| Safety | Failure to follow safety protocols, reckless behavior |
| Integrity | Dishonesty, falsification of records, theft |
| Others | Any violation not covered by the above categories |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Response Deadline | `response_deadline = issued_at + 5 calendar days` (Philippine labor law standard) |
| Explanation Window | Employees can only submit explanations while status is `Issued` and before the deadline |
| Late Explanation | System allows late submissions (after deadline) but flags them as late in the timeline |
| Immutable Explanations | Once submitted, explanations cannot be edited or deleted |
| Resolution Authority | Only HR and ADMIN can resolve NTEs; resolution requires selecting a sanction level |
| Skip Explanation | HR/Admin can resolve an NTE directly from `Issued` status if no explanation is received |
| Sanction Escalation | System displays previous sanctions for the same employee to inform escalation decisions |
| Termination Check | If sanction = `termination`, employee status in the employees table should be updated (manual step) |
| View Restriction | Regular employees (ENGINEER, WORKER) can only view their own disciplinary records |
| Dashboard Count | NTEs with status `Issued` or `Explanation_Received` count as "Active NTEs" on the dashboard |

## Philippine Labor Law Context

The disciplinary module implements the **twin-notice rule** required by the Philippine Supreme Court:

1. **First Notice (NTE)**: Written notice to the employee specifying the grounds for potential disciplinary action, giving them an opportunity to explain
2. **Hearing/Explanation**: The employee's opportunity to be heard (in this system, via written explanation)
3. **Second Notice (Resolution)**: Written notice of the employer's decision after considering the employee's explanation

Failure to follow this process can render a termination illegal even if substantive grounds exist.

## Scholaris Adaptation Notes

- **Student Discipline Records**: Replace "employee" with "student"; add parent/guardian notification requirement
- **Faculty Discipline**: Same NTE workflow but with different violation categories (academic dishonesty in grading, unprofessional conduct)
- **DepEd Child Protection Policy**: For student cases, integrate DepEd Order No. 40 s.2012 (Child Protection Policy) categories
- **Add incident reports**: Separate initial incident report form before formal NTE issuance
- **Guidance counselor involvement**: Add role for guidance counselor in student disciplinary workflow
- **Parent/Guardian notifications**: Automated notification to parents when NTE is issued to a minor student
- **Academic sanctions**: Add sanctions specific to academics -- grade reduction, academic probation, expulsion
- **Violation severity matrix**: Configurable severity-to-sanction mapping per school policy handbook
