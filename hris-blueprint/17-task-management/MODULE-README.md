# Module 17: Task Management (Kanban)

## Purpose

Kanban-style task board with status tracking, priority levels, comments, and proof-of-completion photos. Tasks are linked to projects and assignable to individual employees. Supports manual column ordering and a flat comment system for task-level discussion. Despite being designed as a Kanban board, drag-and-drop is NOT implemented -- status transitions are performed via dropdown menus.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Tasks.tsx | client/src/pages/Tasks.tsx | Frontend | Kanban-style task board with column layout by status |
| TaskDetail.tsx | client/src/pages/TaskDetail.tsx | Frontend | Single task detail view with comments and status controls |
| tasks.ts | server/routes/tasks.ts | Backend | Task and task comment CRUD API endpoints |

## Key Features

- **Kanban Columns**: Todo, In_Progress, Blocked, Done -- each status renders as a visual column
- **Priority Levels**: Low, Medium, High, Critical -- displayed as color-coded badges
- **Project Linking**: Each task belongs to a project for organizational grouping
- **Employee Assignment**: Each task is assigned to a single employee
- **Comments**: Flat (non-threaded) comment list per task with optional attachment URLs
- **Attachment URLs**: Comments can include a link to an uploaded file or document
- **Sort Order**: Integer field for manual ordering within Kanban columns
- **Completion Photo**: URL field for proof-of-work photos (e.g., construction site completion)
- **Due Dates**: Optional due date with overdue visual indicator
- **No Drag-and-Drop**: Status changes are made via dropdown menus, not drag interactions

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/tasks | Authenticated | List tasks with filters (project, status, priority, assignee) |
| POST | /api/tasks | ADMIN, HR* | Create a new task |
| GET | /api/tasks/:id | Authenticated | Get task detail with comments |
| PATCH | /api/tasks/:id | ADMIN, HR* | Update task details or status |
| DELETE | /api/tasks/:id | ADMIN* | Delete a task |
| GET | /api/tasks/:id/comments | Authenticated | List comments for a task |
| POST | /api/tasks/:id/comments | Authenticated | Add a comment to a task |

*Authorization issue noted: POST, PATCH, DELETE originally lacked `hasRole` middleware in the codebase. The intended authorization is listed above. Note that assigned employees can also update status via self-service.

## Dependencies

### Internal Module Dependencies
- **_shared/hooks/use-auth** -- Role detection for create/edit/delete button visibility
- **_shared/components/ui/*** -- Card, Badge, Dialog, Select, Textarea from Shadcn/UI
- **02-employee-management** -- Employee records for assignee selection and display
- **13-permissions-roles** -- isAuthenticated, hasRole middleware
- **16-project-management** -- Projects for task grouping and context

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for task data and comments
- **Zod** -- Request validation for task create/update operations
- **date-fns** -- Due date formatting and overdue calculation

## Database Tables

| Table | Owned | Description |
|-------|-------|-------------|
| tasks | Yes | Task definitions with status, priority, project link, and assignee |
| task_comments | Yes | Flat comment list per task with optional attachments |

## Status Workflow

```
Todo ──→ In_Progress ──→ Done
  │          │
  │          └──→ Blocked ──→ In_Progress (resume)
  │                           │
  └──→ Done (direct)          └──→ Done
```

| Status | Color | Description |
|--------|-------|-------------|
| Todo | Gray | Task created but not started |
| In_Progress | Blue | Currently being worked on |
| Blocked | Red | Waiting on dependency or resolution |
| Done | Green | Task completed |

## Priority Levels

| Priority | Color | Sort Weight | Description |
|----------|-------|-------------|-------------|
| Critical | Red | 1 | Urgent, requires immediate attention |
| High | Orange | 2 | Important, should be done soon |
| Medium | Yellow | 3 | Normal priority |
| Low | Gray | 4 | Can be done when time permits |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Project required | Every task must belong to a project (`project_id` NOT NULL) |
| Single assignee | Each task is assigned to exactly one employee |
| Status transitions | Any status can transition to any other status (no strict state machine) |
| Sort order | `sort_order` determines position within a Kanban column; lower = higher |
| Completion photo | `completion_photo_url` is optional; typically set when status changes to Done |
| Comments immutable | Comments cannot be edited or deleted after creation |
| Attachment via URL | Attachments are stored as URLs (file upload handled separately) |

## Technical Debt

| Issue | Description |
|-------|-------------|
| Missing hasRole | POST, PATCH, DELETE endpoints lacked role-based authorization middleware |
| No drag-and-drop | Kanban board uses dropdown menus instead of drag-and-drop for status changes |
| No subtasks | No support for parent-child task relationships or checklists |
| No time tracking | No built-in time logging per task (hours worked) |
| Comments not editable | No edit or delete capability for task comments |
| No threaded comments | Comments are a flat list with no reply/threading support |

## Scholaris Adaptation Notes

- **Academic task types**: Lesson plan preparation, grade submission, report card generation, exam creation
- **Faculty workload tracking**: Track academic tasks alongside administrative tasks for faculty load computation
- **Grading deadlines**: Tasks with due dates tied to the academic calendar grade submission deadlines
- **Department-level boards**: Each department head sees a Kanban board for their department's tasks
- **Recurring tasks**: Add support for recurring tasks (e.g., weekly lesson plans, monthly reports)
- **Student assignment tracker**: Consider extending for student homework/project submissions (longer term)
- **Approval workflows**: Some academic tasks (e.g., lesson plans) may need department head approval before "Done"
