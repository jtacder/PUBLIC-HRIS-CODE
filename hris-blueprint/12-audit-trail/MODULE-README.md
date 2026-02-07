# Module 12: Audit Trail

## Purpose

Comprehensive activity logging system that records all sensitive operations across the HRIS. Every create, update, delete, approval, and release action is captured with the acting user, affected entity, old/new values, and request metadata. Provides an admin-only interface for reviewing change history and investigating data modifications. Essential for compliance, accountability, and debugging.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| AuditTrail.tsx | client/src/pages/AuditTrail.tsx | Frontend | Admin audit log viewer with filtering and detail expansion |
| storage.ts (partial) | server/storage.ts | Backend | Audit log creation functions embedded in the storage layer |

## Key Features

- **Action Tracking**: Records CREATE, READ, UPDATE, DELETE, APPROVE, and RELEASE operations
- **Entity Type Coverage**: Employee, Payroll, Leave, CashAdvance, Disciplinary, Expense, Project, Task, Devotional, Schedule, and more
- **Change Diff Storage**: Stores old_values and new_values as JSONB for full before/after comparison
- **Request Metadata**: Captures IP address and user agent string for each logged action
- **Filterable Log Viewer**: Admin UI supports filtering by action type, entity type, user, and date range
- **Detail Expansion**: Click any log entry to see the full old/new value diff in a formatted JSON view
- **Immutable Records**: Audit logs cannot be updated or deleted, even by admins

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/audit-logs | ADMIN | List audit logs with pagination, filters by action, entity_type, user_id, date range |
| GET | /api/audit-logs/:id | ADMIN | Get full detail of a single audit log entry including old/new values |

## Dependencies

### Internal Module Dependencies
- **_shared/hooks/use-auth** -- Role detection (admin-only access)
- **_shared/components/ui/*** -- Table, Badge, Card, Input, Select from Shadcn/UI
- **13-permissions-roles** -- isAuthenticated middleware, hasRole("ADMIN") middleware
- **All other modules** -- Audit entries are created by operations in every module

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state for log listing and pagination
- **date-fns** -- Timestamp formatting in the log viewer
- **Zod** -- Query parameter validation for filter inputs

## Database Tables

| Table | Owned | Description |
|-------|-------|-------------|
| audit_logs | Yes | Immutable log of all tracked operations with user, entity, and change data |

## Entity Types Tracked

| Entity Type | Module Source | Actions |
|-------------|-------------|---------|
| Employee | 02-employee-management | CREATE, UPDATE, DELETE |
| Payroll | 08-payroll-system | CREATE, UPDATE, APPROVE, RELEASE |
| Leave | 06-leave-management | CREATE, UPDATE, APPROVE, DELETE |
| CashAdvance | 07-loans-management | CREATE, UPDATE, APPROVE |
| Disciplinary | 09-disciplinary | CREATE, UPDATE |
| Expense | 18-expense-management | CREATE, UPDATE, APPROVE |
| Project | 16-project-management | CREATE, UPDATE, DELETE |
| Task | 17-task-management | CREATE, UPDATE, DELETE |
| Schedule | 03-schedule-management | CREATE, UPDATE, DELETE |
| Devotional | 11-devotional | CREATE, UPDATE, DELETE |
| Settings | 10-hr-settings | UPDATE |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Admin-only access | Only ADMIN role can view the audit trail UI and query the API |
| Immutable logs | Audit log entries cannot be modified or deleted once created |
| Automatic logging | Audit entries are created server-side in the storage layer during write operations |
| JSONB diff | `old_values` captures the record state before the change; `new_values` captures the state after |
| Null old_values | On CREATE actions, `old_values` is NULL; on DELETE actions, `new_values` is NULL |
| IP capture | `ip_address` is extracted from `req.ip` or `X-Forwarded-For` header |

## Technical Debt

| Issue | Description |
|-------|-------------|
| Inconsistent coverage | Not all write operations across all modules consistently create audit entries |
| No bulk log creation | Batch operations (e.g., bulk payroll) create individual audit entries, no batch grouping |
| No retention policy | No automatic cleanup of old audit logs; table grows indefinitely |
| No export feature | No CSV/PDF export of audit logs for external compliance reporting |

## Scholaris Adaptation Notes

- **Direct reuse**: The audit trail pattern applies identically to Scholaris -- same table structure, same logging approach
- **Add education-specific entity types**: Enrollment, Grade, Section, Subject, Tuition, SchoolYear
- **Compliance alignment**: Schools under DepEd/CHED may have specific record-keeping requirements
- **Parent visibility**: Consider allowing parents to see audit trail entries related to their child's records (filtered view)
- **Retention policy**: Implement configurable log retention (e.g., 7 years for academic records) to comply with education regulations
- **Grade change auditing**: Critical for academic integrity -- every grade modification must be logged with justification
