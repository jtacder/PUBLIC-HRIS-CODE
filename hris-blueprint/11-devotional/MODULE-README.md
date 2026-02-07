# Module 11: Devotional System

## Purpose

Daily devotional content management for employee spiritual wellness. Provides daily scripture-based readings that employees can view and mark as read, with engagement tracking. Admin users manage devotional content through full CRUD operations, while all authenticated employees can access the daily reading and track their personal reading progress.

**Note:** A yearly theme feature was originally planned and partially implemented in the schema, but has been deprecated. The schema columns are preserved for backward compatibility, but associated tests and UI elements have been removed.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Devotionals.tsx | client/src/pages/Devotionals.tsx | Frontend | Daily devotional display with admin CRUD management panel |
| devotionals.ts | server/routes/devotionals.ts | Backend | Devotional content API with reading progress tracking |

## Key Features

- **Daily Reading Display**: Shows the current day's devotional with title, scripture reference, and full content
- **Scripture References**: Each devotional links to specific Bible verses for context
- **Admin Content Management**: Full CRUD (Create, Read, Update, Delete) for devotional entries
- **Reading Progress Tracking**: Employees mark devotionals as read; system logs engagement
- **Engagement Logging**: Tracks which employees read which devotionals and when
- **Date-Based Retrieval**: Devotionals are associated with specific dates for daily scheduling
- **Author Attribution**: Each devotional credits its author

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/devotionals | All authenticated | Get today's devotional content |
| GET | /api/devotionals/admin/all | ADMIN, HR | List all devotionals with pagination for management |
| POST | /api/devotionals | ADMIN, HR | Create a new devotional entry |
| PATCH | /api/devotionals/:id | ADMIN, HR | Update an existing devotional |
| DELETE | /api/devotionals/:id | ADMIN | Delete a devotional entry |
| POST | /api/devotionals/:id/mark-read | All authenticated | Mark a devotional as read by the current user |

## Dependencies

### Internal Module Dependencies
- **_shared/hooks/use-auth** -- Role detection for admin panel visibility
- **_shared/components/ui/*** -- Card, Button, Dialog, Input from Shadcn/UI
- **02-employee-management** -- Employee records for reading log association
- **13-permissions-roles** -- isAuthenticated middleware, hasRole middleware

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for devotional data
- **date-fns** -- Date formatting for devotional display dates
- **Zod** -- Request body validation for create/update operations

## Database Tables

| Table | Owned | Description |
|-------|-------|-------------|
| devotionals | Yes | Devotional content entries with date, scripture reference, and author |
| devotional_reading_logs | Yes | Tracks which employees have read which devotionals |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Daily content | `GET /api/devotionals` returns the devotional matching today's date |
| Single read per devotional | An employee can only mark a devotional as read once (UNIQUE constraint on devotional_id + employee_id) |
| Admin-only management | Only ADMIN and HR roles can create/update devotionals; only ADMIN can delete |
| Date uniqueness | Each date should ideally have one devotional, though not enforced at DB level |
| Soft content | No hard dependency on other modules -- devotionals are standalone content |
| Deprecated yearly theme | `theme` and `year` columns exist in schema but are not used in current UI or API |

## Scholaris Adaptation Notes

- **Rename to Chapel/Devotional module**: Schools typically have chapel services; devotionals map to chapel readings
- **Morning assembly announcements**: Extend to include school-wide announcements shown alongside devotionals
- **Faculty-authored devotionals**: Allow faculty members to submit devotionals for admin approval
- **Student participation tracking**: Track chapel/devotional attendance for students (may tie into attendance module)
- **Integrate with school calendar**: Link devotionals to the academic calendar (e.g., special readings for school events)
- **Multi-audience support**: Different devotionals for different groups (elementary, high school, faculty)
- **Print/export for bulletin boards**: Generate printable devotional cards for physical display in classrooms
