# Module 16: Project Management

## Purpose

Multi-site project management with geofencing support for attendance validation. Manages both permanent office locations and time-bound project sites, each with a geographic center point and radius for geofenced clock-in verification. Tracks employee assignments to projects with date ranges and aggregates hours worked from attendance logs. Supports a full status workflow from planning through completion or cancellation.

**Key Distinction:** Projects with `is_office = true` represent permanent office locations (no deadline, cannot be completed/cancelled). Projects with `is_office = false` are actual projects with timelines, budgets, and completion states.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Projects.tsx | client/src/pages/Projects.tsx | Frontend | Project list view with status filters and create/edit dialogs |
| ProjectDetail.tsx | client/src/pages/ProjectDetail.tsx | Frontend | Single project detail with assignments, hours, and geofence map |
| projects.ts | server/routes/projects.ts | Backend | Project and assignment CRUD API endpoints |

## Key Features

- **Office vs Project Distinction**: Offices are permanent locations; projects have deadlines and budgets
- **Geofencing**: Each location has a center point (latitude/longitude) and radius in meters
- **Haversine Formula**: Server-side distance calculation verifies if a clock-in GPS coordinate falls within the geofence radius
- **Employee Assignment Tracking**: Assign employees to projects with start/end dates and active status
- **Status Workflow**: Planning -> Active -> On Hold -> Completed -> Cancelled
- **Budget Tracking**: Planned budget vs actual cost comparison
- **Hours Aggregation**: Total hours worked per project derived from attendance logs within the geofence
- **Project Code**: Unique short code for each project (e.g., PROJ-001, OFC-MAIN)

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/projects | Authenticated | List all projects with optional status filter |
| POST | /api/projects | ADMIN, HR* | Create a new project or office location |
| GET | /api/projects/:id | Authenticated | Get project detail with assignments and hours summary |
| PATCH | /api/projects/:id | ADMIN, HR* | Update project details or status |
| DELETE | /api/projects/:id | ADMIN* | Soft-delete or archive a project |
| GET | /api/projects/:id/assignments | Authenticated | List employee assignments for a project |
| POST | /api/projects/:id/assignments | ADMIN, HR* | Assign an employee to a project |
| PATCH | /api/projects/:id/assignments/:assignmentId | ADMIN, HR* | Update assignment dates or active status |

*Authorization issue noted: POST, PATCH, DELETE originally lacked `hasRole` middleware in the codebase. The intended authorization is listed above.

## Dependencies

### Internal Module Dependencies
- **_shared/hooks/use-auth** -- Role detection for edit/delete button visibility
- **_shared/components/ui/*** -- Table, Card, Dialog, Select, Badge from Shadcn/UI
- **02-employee-management** -- Employee records for assignment selection and display
- **04-attendance-system** -- Attendance logs for hours aggregation within geofence
- **13-permissions-roles** -- isAuthenticated, hasRole middleware

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for project data
- **Zod** -- Request validation for create/update operations
- **date-fns** -- Date formatting for project timelines and assignment periods

## Database Tables

| Table | Owned | Description |
|-------|-------|-------------|
| projects | Yes | Project/office definitions with geofence coordinates and status |
| project_assignments | Yes | Employee-to-project assignment records with date ranges |

## Geofencing Details

```
Haversine Formula (used server-side):
  a = sin^2(dlat/2) + cos(lat1) * cos(lat2) * sin^2(dlng/2)
  c = 2 * atan2(sqrt(a), sqrt(1-a))
  distance = R * c   (where R = 6371000 meters, Earth's radius)

If distance <= project.geo_radius:
  Clock-in is within the geofence (valid)
Else:
  Clock-in is outside the geofence (flagged)
```

| Field | Type | Description |
|-------|------|-------------|
| location_lat | DECIMAL(10,7) | Latitude of the project/office center point |
| location_lng | DECIMAL(10,7) | Longitude of the project/office center point |
| geo_radius | INTEGER (meters) | Geofence radius, default 100 meters |

## Status Workflow

```
Planning ──→ Active ──→ On Hold ──→ Active (resume)
                   │                    │
                   └──→ Completed       └──→ Cancelled
                   └──→ Cancelled

Offices (is_office = true): Always "Active" status, no transitions
```

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Office immutability | Offices (`is_office = true`) cannot be Completed or Cancelled |
| Code uniqueness | `project.code` must be unique across all projects and offices |
| Assignment overlap | An employee can be assigned to multiple projects simultaneously |
| Active assignment | `is_active = false` assignments are historical (soft-ended) |
| Geofence default | Default radius is 100 meters if not specified |
| Budget tracking | `actual_cost` is manually updated (not auto-calculated from payroll) |
| Cascade assignments | When a project is deleted, its assignments are also removed |

## Technical Debt

| Issue | Description |
|-------|-------------|
| Missing hasRole | POST, PATCH, DELETE endpoints lacked role-based authorization middleware |
| No map UI | Geofence is configured via lat/lng input fields, no interactive map picker |
| Manual cost tracking | Actual cost is manually entered, not derived from payroll/attendance data |
| No project manager role | No dedicated "project manager" assignment type with elevated permissions |

## Scholaris Adaptation Notes

- **Campuses as offices**: Each campus is an `is_office = true` project with its geofence for faculty/staff attendance
- **Buildings within campuses**: Model buildings as sub-locations within a campus for room-level tracking
- **Department offices**: Each department office can be a geofenced location for faculty clock-in
- **Event venues**: Temporary project entries for off-campus school events with geofencing
- **Remove budget tracking**: Schools typically track budgets differently (per department, not per project)
- **Add campus field**: Link projects/offices to specific campuses for multi-campus schools
- **Class section rooms**: Consider linking sections to physical rooms for automated scheduling conflicts
