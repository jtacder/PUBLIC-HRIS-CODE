# HRIS Blueprint Guide — ElectroManage ERP → Scholaris Academy

> **Purpose:** This is the master reference document for reusing the ElectroManage HRIS architecture to build **Scholaris**, a School Management System. It provides a complete map of the HRIS codebase, module-by-module documentation, database schemas, integration patterns, code patterns, and a detailed HRIS→Scholaris transition guide.
>
> **Source System:** ElectroManage ERP — Philippine HR/Payroll system for electrical contracting companies
> **Target System:** Scholaris Academy — Philippine School Management System
> **Codebase Stats:** 57,534 lines of TypeScript across 216 files, 40+ database tables, ~149 API endpoints

---

## Table of Contents

1. [Architecture Overview](#section-1-architecture-overview)
2. [Module Inventory](#section-2-module-inventory)
3. [Shared Infrastructure](#section-3-shared-infrastructure)
4. [Database Schema Map](#section-4-database-schema-map)
5. [HRIS → Scholaris Transition Guide](#section-5-hris--scholaris-transition-guide)
6. [Integration Patterns](#section-6-integration-patterns)
7. [Code Pattern Reference](#section-7-code-pattern-reference)

---

## Section 1: Architecture Overview

### 1.1 High-Level Description

ElectroManage ERP is a full-stack, production-grade HR management system built for Philippine electrical contracting companies. It manages the complete employee lifecycle: hiring, attendance tracking (QR + GPS geofencing), payroll computation with Philippine government deductions (SSS, PhilHealth, Pag-IBIG, TRAIN Law), leave management, cash advances, disciplinary actions, and document management (201 files).

The system follows a **monolithic MVC** pattern with clear separation of concerns, using a monorepo structure with shared types between frontend and backend.

### 1.2 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20.x | Server runtime |
| **Language** | TypeScript | 5.6.3 | Type safety across full stack |
| **Frontend** | React | 18.3.1 | UI Framework (SPA) |
| **Build Tool** | Vite | 7.3.0 | Dev server + bundling |
| **Routing** | Wouter | 3.3.5 | Client-side routing (lightweight) |
| **State** | TanStack React Query | 5.60.5 | Server state + caching (primary state management) |
| **Forms** | React Hook Form + Zod | 7.55.0 / 3.24.2 | Form handling + schema validation |
| **UI Library** | Shadcn/UI + Radix UI | Various | 40+ accessible component primitives |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS |
| **Charts** | Recharts | 2.15.2 | Data visualization |
| **Animations** | Framer Motion | 11.13.1 | UI animations |
| **Icons** | Lucide React | 0.453.0 | Icon library |
| **Backend** | Express.js | 4.21.2 | API server |
| **ORM** | Drizzle ORM | 0.39.3 | Type-safe database operations |
| **Database** | PostgreSQL | 14+ | Data storage (40+ tables) |
| **Auth** | Passport.js + bcrypt | 0.7.0 / 6.0.0 | Session-based authentication |
| **Sessions** | express-session + connect-pg-simple | 1.18.2 / 10.0.0 | PostgreSQL-backed sessions |
| **Security** | Helmet + express-rate-limit | 8.1.0 / 8.2.1 | HTTP headers + rate limiting |
| **QR Codes** | qrcode + html5-qrcode | 1.5.4 / 2.3.8 | QR generation + scanning |
| **Face Detection** | face-api.js | 0.22.2 | Face detection + liveness checks |
| **Excel** | xlsx | 0.18.5 | Bulk import/export |
| **Email** | Resend | 6.9.1 | Email service (payslips, notifications) |
| **Error Tracking** | Sentry | 8.0.0 | Production error monitoring |
| **Date Utils** | date-fns | 3.6.0 | Date manipulation |

### 1.3 Monorepo Folder Structure

```
project-root/
├── client/                          # Frontend React SPA
│   ├── index.html                   # Vite entry HTML
│   └── src/
│       ├── App.tsx                  # Routes, layout, Suspense, sidebar
│       ├── main.tsx                 # React DOM entry point
│       ├── index.css                # Global styles + CSS variables (theme)
│       ├── components/
│       │   ├── ui/                  # 40+ Shadcn/UI components
│       │   ├── sidebar.tsx          # Role-based navigation sidebar
│       │   ├── searchable-employee-select.tsx  # Accessible searchable dropdown
│       │   └── theme-toggle.tsx     # Dark/light mode toggle
│       ├── hooks/
│       │   ├── use-auth.ts          # Authentication hook (useAuth)
│       │   ├── use-toast.ts         # Toast notifications
│       │   └── use-mobile.tsx       # Responsive detection
│       ├── lib/
│       │   ├── queryClient.ts       # TanStack Query config + apiRequest()
│       │   ├── utils.ts             # cn() utility, helpers
│       │   └── auth.ts              # Auth client utilities
│       └── pages/                   # 23+ page components
│           ├── Dashboard.tsx        # Admin dashboard
│           ├── Employees.tsx        # Employee list
│           ├── EmployeeDetail.tsx   # Employee 201 file
│           ├── EmployeeForm.tsx     # Create/edit employee
│           ├── Projects.tsx         # Project list
│           ├── ProjectDetail.tsx    # Project detail
│           ├── Tasks.tsx            # Kanban board
│           ├── TaskDetail.tsx       # Task detail
│           ├── Schedules.tsx        # Schedule management
│           ├── Attendance.tsx       # Attendance records
│           ├── ClockIn.tsx          # QR scanner + photo
│           ├── Payroll.tsx          # Payroll list
│           ├── PayrollDetail.tsx    # Payroll computation
│           ├── Payslip.tsx          # Individual payslip
│           ├── TwoOhOneFiles.tsx    # 201 Files
│           ├── Disciplinary.tsx     # NTE list
│           ├── DisciplinaryDetail.tsx
│           ├── LeaveRequests.tsx    # Leave requests
│           ├── LeaveForm.tsx        # Leave form
│           ├── CashAdvances.tsx     # Cash advance list
│           ├── CashAdvanceForm.tsx  # Cash advance form
│           ├── HRSettings.tsx       # Settings (4 tabs)
│           ├── Devotionals.tsx      # Daily devotional
│           ├── AuditTrail.tsx       # Audit log viewer
│           ├── Landing.tsx          # Public landing page
│           ├── Login.tsx            # Login page
│           └── NotFound.tsx         # 404 page
│
├── server/                          # Backend Express API
│   ├── index.ts                     # Express app entry (~120 lines)
│   ├── db.ts                        # Drizzle database connection (~20 lines)
│   ├── storage.ts                   # Database storage layer (800+ lines, ALL CRUD)
│   ├── email-auth.ts                # Session auth, CSRF, login/logout (~350 lines)
│   ├── payroll-calculator.ts        # Philippine payroll computation (~400 lines)
│   ├── static.ts                    # Static asset serving + cache headers
│   ├── seed-superadmin.ts           # Superadmin account seeder
│   ├── seed-permissions.ts          # Permission seeder
│   ├── config/
│   │   └── index.ts                 # Centralized config + Zod env validation (~80 lines)
│   ├── middleware/
│   │   ├── security.ts              # Helmet, rate limiting, sanitization (~200 lines)
│   │   └── error-handler.ts         # AppError classes, asyncHandler (~150 lines)
│   ├── routes/
│   │   ├── index.ts                 # Central route registration
│   │   ├── dashboard.ts             # Dashboard statistics
│   │   ├── employees.ts             # Employee CRUD, QR, documents
│   │   ├── projects.ts              # Project CRUD, assignments, geofence
│   │   ├── tasks.ts                 # Task CRUD, comments
│   │   ├── attendance.ts            # Clock-in/out, GPS, verification
│   │   ├── payroll.ts               # Payroll computation, approval
│   │   ├── payroll-periods.ts       # Period management
│   │   ├── payslips.ts              # Individual payslip operations
│   │   ├── disciplinary.ts          # NTE workflow
│   │   ├── leave-requests.ts        # Leave request CRUD
│   │   ├── cash-advances.ts         # Cash advance management
│   │   ├── hr-settings.ts           # System configuration
│   │   ├── employee-self-service.ts # Employee portal APIs
│   │   ├── expenses.ts              # Expense workflow
│   │   └── documents.ts             # Document management
│   └── utils/
│       ├── index.ts                 # Re-exports
│       ├── datetime.ts              # Philippine timezone (UTC+8)
│       ├── geo.ts                   # Haversine formula, geofencing
│       ├── validation.ts            # Zod schemas for API input
│       ├── logger.ts                # Structured logging
│       └── soft-delete.ts           # Soft delete utilities
│
├── shared/                          # Shared between client + server
│   ├── schema.ts                    # Drizzle ORM schema (700+ lines, 40+ tables)
│   └── models/
│       └── auth.ts                  # Auth Zod schemas
│
├── migrations/                      # Drizzle-kit migration files
├── public/
│   └── models/                      # face-api.js model files
│
└── Config files:
    ├── package.json                 # Dependencies (103 packages)
    ├── tsconfig.json                # TypeScript (strict, path aliases)
    ├── vite.config.ts               # Vite (React plugin, aliases)
    ├── tailwind.config.ts           # Tailwind (dark mode, HSL colors)
    ├── drizzle.config.ts            # Drizzle (PostgreSQL, migrations)
    ├── vitest.config.ts             # Vitest (test framework)
    ├── components.json              # Shadcn/UI (New York style)
    └── .env.example                 # Environment template
```

### 1.4 How Routing Works

**Client-side (Wouter):**
- Wouter provides lightweight routing (3.3.5 KB vs React Router's 30+ KB)
- Routes defined in `App.tsx` using `<Route path="/path" component={Page} />`
- Role-based conditional rendering: `{isAdmin && <Route ... />}`
- Lazy loading via `React.lazy()` for 14+ page components with `<Suspense>` fallback
- Critical pages (Landing, Login, NotFound) remain eagerly loaded

**Server-side (Express):**
- 14 domain-specific route modules registered via `server/routes/index.ts`
- All API routes prefixed with `/api/`
- Middleware chain: `security → session → auth → routes → errorHandler`

### 1.5 Authentication & Authorization Flow

```
1. User submits email + password → POST /api/auth/login
2. Server validates with bcrypt (12 salt rounds)
3. Session created in PostgreSQL (connect-pg-simple, 7-day TTL)
4. CSRF token issued and validated on state-changing requests
5. Session cookie: httpOnly, secure (prod), sameSite: lax
6. Session regenerated on login (prevents session fixation)
```

**Role-Based Access Control:**
- Roles: `ADMIN`, `HR`, `ENGINEER`, `WORKER`
- Superadmin flag bypasses ALL permission checks
- Server middleware: `isAuthenticated` → `hasRole("ADMIN", "HR")`
- Individual permission grants with expiry support
- 5-minute permission cache TTL
- Client-side: `useAuth()` hook provides `isAdmin`, `user.role` for UI rendering
- Client guards are UX-only; server middleware is the actual security layer

**Rate Limiting:**

| Endpoint | Window | Max Requests |
|----------|--------|--------------|
| Global API | 15 min | 1,000 |
| Auth/Login | 15 min | 10 |
| Password Change | 1 hour | 3 |
| Write Operations | 1 min | 60 |

### 1.6 Database & ORM Configuration

- **Drizzle ORM** with PostgreSQL driver (`pg`)
- Schema defined in `shared/schema.ts` (700+ lines, 40+ tables)
- Type-safe queries with `$inferSelect` / `$inferInsert` types
- Migrations managed via `drizzle-kit` (`npm run db:push`)
- Connection via `DATABASE_URL` environment variable
- Storage layer in `server/storage.ts` (800+ lines) — single class with all CRUD methods

**Known Issues:**
- N+1 query pattern in payroll computation (loops with per-employee queries)
- Missing transaction boundaries for multi-step operations (payroll approval)
- `as any` type assertions in storage layer to bypass Drizzle type issues
- Photos stored as base64 in PostgreSQL TEXT fields (should use cloud storage)

### 1.7 State Management

TanStack React Query is the **sole state management** solution (no Zustand/Redux):

- Query keys: `['employees']`, `['employee', id]`, `['attendance', 'today']`
- `useQuery` for data fetching with automatic caching
- `useMutation` for create/update/delete operations
- Cache invalidation via `queryClient.invalidateQueries()`
- `apiRequest()` helper wraps `fetch()` with credentials and error handling

### 1.8 Form Handling

**Pattern:** React Hook Form + Zod schema + Shadcn Form components
- Zod schemas define validation rules
- `useForm({ resolver: zodResolver(schema) })` connects validation
- Shadcn `<Form>`, `<FormField>`, `<FormItem>`, `<FormControl>`, `<FormMessage>` for layout
- Submit handlers call `useMutation` for API operations
- Toast notifications on success/error via `useToast()`

### 1.9 API Route Structure

Standard Express route pattern:
```typescript
router.get("/", isAuthenticated, asyncHandler(async (req, res) => {
  const data = await storage.getItems();
  res.json(data);
}));

router.post("/", isAuthenticated, hasRole("ADMIN", "HR"), asyncHandler(async (req, res) => {
  const validated = insertSchema.parse(req.body);
  const created = await storage.createItem(validated);
  res.status(201).json(created);
}));
```

### 1.10 Error Handling Patterns

- `AppError` base class with subclasses: `ValidationError(400)`, `AuthenticationError(401)`, `AuthorizationError(403)`, `NotFoundError(404)`, `ConflictError(409)`, `RateLimitError(429)`
- `asyncHandler()` wrapper catches async errors and passes to `next(err)`
- `globalErrorHandler` middleware handles all errors consistently
- Zod validation errors auto-formatted with field-level messages
- Stack traces hidden in production

### 1.11 Loading & Toast Patterns

- Skeleton loaders via `<Suspense>` fallback for lazy-loaded pages
- `isLoading` from `useQuery` for data loading states
- Shadcn Skeleton component for placeholder UI
- Toast notifications via `useToast()` — success (default), error (destructive)

---

## Section 2: Module Inventory

### Module Summary Table

| # | Module | Pages | API Endpoints | DB Tables | Reuse Level |
|---|--------|-------|---------------|-----------|-------------|
| 01 | Dashboard | 1 | 3 | 0 (reads) | 🟡 ADAPT |
| 02 | Employee Management | 3 | 12 | 3 | 🟡 ADAPT |
| 03 | Schedule Management | 1 | 0 (part of employees) | 0 (fields) | 🔴 INSPIRE |
| 04 | Attendance System | 2 | 7 | 2 | 🟡 ADAPT |
| 05 | 201 Files | 1 | 3 (shared) | 2 (shared) | 🟡 ADAPT |
| 06 | Leave Management | 2 | 7 | 3 | 🟡 ADAPT |
| 07 | Loans Management | 2 | 6 | 2 | 🟢 DIRECT |
| 08 | Payroll System | 3 | 9 | 3 | 🔴 INSPIRE |
| 09 | Disciplinary | 2 | 6 | 3 | 🟡 ADAPT |
| 10 | HR Settings | 1 | 11 | 2 | 🟡 ADAPT |
| 11 | Devotional System | 1 | 6 | 2 | 🟢 DIRECT |
| 12 | Audit Trail | 1 | 2 | 1 | 🟢 DIRECT |
| 13 | Permissions & Roles | 0 (middleware) | 1 | 3 | 🟢 DIRECT |
| 14 | Notification System | 0 (planned) | 0 | 0 | 🔴 INSPIRE |
| 15 | Employee Portal | 6+ | ~15 | 0 (reads) | 🟡 ADAPT |
| 16 | Project Management | 2 | 8 | 2 | 🟡 ADAPT |
| 17 | Task Management | 2 | 7 | 2 | 🟡 ADAPT |
| 18 | Expense Management | 1 | 5 | 2 | 🟢 DIRECT |

> See individual `MODULE-README.md` files in each module folder for complete details.

### Module 01: Dashboard

**Purpose:** Enterprise overview with statistics cards, attendance trends, payroll summary, and quick actions.

**Key Features:**
- 7 stat cards: total employees, today's attendance, active projects, pending tasks, payroll summary, pending expenses, active NTEs
- Quick action buttons: clock-in, new employee, run payroll
- Role-based: Admin/HR sees everything, Workers see personal dashboard
- Charts via Recharts library

**API Routes:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/dashboard/statistics | All dashboard statistics |
| GET | /api/dashboard/metrics | Chart data |
| GET | /api/dashboard/overview | Summary overview |

**Database:** Reads from employees, attendance_logs, projects, tasks, payroll_records, expenses, disciplinary_records (no own tables).

**Dependencies:** All other modules (aggregates data from everywhere).

---

### Module 02: Employee Management

**Purpose:** Complete employee lifecycle management — CRUD, document management, QR badge generation, government ID tracking, bulk import/export.

**Key Features:**
- Employee list with search, filter by status/role
- Create/edit form: personal info, employment details, payroll setup, shift configuration
- QR code generation (32-char hex token) for attendance
- Bulk import via Excel template (xlsx library)
- Government IDs: SSS, TIN, PhilHealth, Pag-IBIG
- Employee statuses: Active, Probationary, Terminated, Suspended
- Soft delete support (is_deleted flag)

**API Routes (12):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/employees | List all employees |
| POST | /api/employees | Create employee |
| GET | /api/employees/:id | Get by ID |
| PATCH | /api/employees/:id | Update |
| DELETE | /api/employees/:id | Soft delete |
| GET | /api/employees/:id/complete-file | Full 201 file data |
| POST | /api/employees/:id/documents | Upload document |
| DELETE | /api/employees/:id/documents/:docId | Delete document |
| GET | /api/employees/:id/qr-code | QR data URL |
| GET | /api/employees/:id/qr-code/download | QR PNG download |
| POST | /api/employees/bulk-upload | Excel import |
| GET | /api/employees/template/download | Download template |

**Database Tables:** employees (50+ fields), employee_documents, employee_government_ids

**Complex Logic:**
- QR token: `crypto.randomBytes(16).toString('hex')` — 32-char hex, unique per employee
- Bulk import: xlsx parsing with row-by-row validation, error reporting per row

---

### Module 03: Schedule Management

**Purpose:** Shift scheduling with day/night shift support. Currently embedded in employee records rather than as a standalone module.

**Key Features:**
- Day Shift: 06:00-21:59, Night Shift: 22:00-05:59
- Per-employee fields: shiftStartTime, shiftEndTime, shiftWorkDays
- Auto-detection of shift type at clock-in based on time of day

**Database:** Uses fields on the `employees` table (no separate tables).

**Scholaris Note:** This is the module that changes most dramatically — needs period-based class scheduling, room assignments, faculty load, time conflict detection.

---

### Module 04: Attendance System

**Purpose:** QR-based clock-in/out with GPS geofencing, photo capture, face detection, and tardiness tracking.

**Key Features:**
- QR scan → token validation → employee lookup
- Auto-detect day/night shift
- Duplicate clock-in prevention
- Active project assignment verification
- Geofence check (Haversine formula, all assigned projects)
- 15-minute grace period for tardiness
- Photo capture (JPEG base64, 640×480)
- Face detection with liveness challenges (blink, turn left/right)
- Overtime detection and approval workflow

**Clock-in Flow:**
1. Scan QR code → validate token → find employee
2. Auto-detect shift type (day/night based on clock-in hour)
3. Check for duplicate clock-in
4. Verify active project assignment exists
5. **Geofence check** — loop all assigned projects, verify GPS within radius
6. Calculate tardiness (15-min grace period)
7. Capture photo snapshot (JPEG, base64)
8. Create attendance log

**Geofencing (Haversine Formula):**
```
R = 6371e3 meters (Earth's radius)
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1-a))
distance = R × c
isWithin = distance ≤ project.geoRadius
```

**Verification Statuses:** Verified, Off-site, Pending, Flagged

**API Routes (7):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/attendance/today | Today's records |
| POST | /api/attendance/clock-in | Clock in (QR + GPS + photo) |
| POST | /api/attendance/clock-out | Clock out |
| PATCH | /api/attendance/:id | Edit record (admin) |
| POST | /api/attendance/bulk-upload | Excel import |
| GET | /api/attendance/template/download | Download template |
| POST | /api/attendance/:id/justification | Off-site justification |

**Known Issues:**
- Face verification runs client-side but result NOT sent to server (`faceVerified` always false)
- Photos stored as base64 in database (risk of bloat)
- Liveness check is skippable

---

### Module 05: 201 Files

**Purpose:** Philippine standard complete employee record compilation ("201 File").

**Sections:** Personal Information, Employment Records, Payroll Setup, Disciplinary History, Documents

**Database:** Uses employee_documents, employee_government_ids tables (shared with Module 02).

---

### Module 06: Leave Management

**Purpose:** Leave types, requests, approval workflows, and balance tracking.

**Leave Types:** Sick, Vacation, Bereavement, Maternity, Paternity, Emergency
**Accrual Modes:** Annual (full Day 1) or Monthly (total/12 × completedMonths)

**Business Rules:**

| Condition | Actor | Outcome |
|-----------|-------|---------|
| Submit request | Employee | status = "Pending" |
| Approve | HR/ADMIN | status = "Approved", allocation updated |
| Reject | HR/ADMIN | status = "Rejected", requires remarks |
| Cancel own pending | Employee | status = "Cancelled" |
| Cancel own approved | Employee | **REJECTED** — contact HR |
| Annual accrual | System | Full allocation Day 1 |
| Monthly accrual | System | (total/12) × completedMonths |

**Payroll Integration:** isPaid=false leaves → `days × dailyRate` deducted from net pay.

---

### Module 07: Loans Management (Cash Advances)

**Purpose:** Cash advance requests with approval workflow, amortization, and automatic payroll deduction.

**Workflow:** Pending → Approved → Disbursed → Fully_Paid (auto when balance=0)

**Key Formula:** Payroll deduction = `min(deductionPerCutoff, remainingBalance)`

**Business Rules:**

| Condition | Outcome |
|-----------|---------|
| deductionPerCutoff > amount | **REJECTED** — invalid |
| Payroll approved (Draft→Approved) | Cash advance balances updated |
| remainingBalance = 0 | Auto-mark "Fully_Paid" |

---

### Module 08: Payroll System

**Purpose:** Automated Philippine payroll computation with government deductions. **Most complex module.**

**Salary Calculation:**
```
Basic Pay = Days Worked × Daily Rate
Standard: 22 working days/month
```

**Overtime Multipliers:**

| Type | Multiplier |
|------|-----------|
| Regular | 1.25× |
| Rest Day | 1.30× |
| Holiday | 2.00× |

**Government Deductions (Philippine 2024/2025):**
- **SSS:** 57 salary brackets (₱4,000-₱30,000+ MSC), RA 11199, max semi-monthly ₱675
- **PhilHealth:** 5% of basic (2.5% employee), floor ₱10,000, ceiling ₱100,000, max ₱1,250/semi-monthly
- **Pag-IBIG:** ≤₱1,500 salary = 1%, >₱1,500 = 2%, max MSC ₱5,000, max ₱50/semi-monthly
- **Withholding Tax:** TRAIN Law — 6 progressive brackets (0%, 15%, 20%, 25%, 30%, 35%), applied AFTER mandatory contributions

**Net Pay Formula:**
```
Net Pay = Gross Pay - (SSS + PhilHealth + PagIBIG + Tax + CashAdvanceDeduction + LateDeduction + UnpaidLeave)
```

**Payroll Status Workflow:** `DRAFT → APPROVED → RELEASED`

**Missing Features (noted in audit):**
- Night Differential not implemented
- 13th Month Pay not implemented
- Holiday Pay only via OT multiplier
- Late grace period configured but NOT enforced in calculator

---

### Module 09: Disciplinary

**Purpose:** NTE (Notice to Explain) workflow for employee discipline.

**Workflow:** Issued → Explanation_Received → Resolved (5-day response deadline)

**Sanctions:** verbal_warning, written_warning, suspension, termination

---

### Module 10: HR Settings

**Purpose:** System configuration with 4-tab settings page.

**Tabs:**
1. Payroll Cutoffs — Semi-monthly/monthly cutoff period definitions
2. Contributions — SSS, PhilHealth, Pag-IBIG rates display (read-only)
3. Leave Types — Configure types and annual allocations
4. Holidays — Regular and special non-working holidays

---

### Module 11: Devotional System

**Purpose:** Daily devotional content for employee spiritual wellness.

---

### Module 12: Audit Trail

**Purpose:** Comprehensive logging of all sensitive operations.

**Actions:** CREATE, READ, UPDATE, DELETE, APPROVE, RELEASE

**Entity Types:** Employee, Payroll, Leave, CashAdvance, Disciplinary, Expense, etc.

---

### Module 13: Permissions & Roles

**Purpose:** RBAC system with 4 roles, superadmin bypass, individual grants, permission expiry, 5-minute cache.

---

### Module 14: Notification System

**Purpose:** Planned but not fully implemented. Infrastructure ready (ws, web-push, VAPID keys).

---

### Module 15: Employee Portal (Self-Service)

**Purpose:** Self-service portal for employees to view their own data: attendance, tasks, payslips, profile, disciplinary, requests.

---

### Module 16: Project Management

**Purpose:** Multi-site project management with geofencing for attendance validation. Office vs. Project distinction.

---

### Module 17: Task Management

**Purpose:** Kanban-style task board. Statuses: Todo/In_Progress/Blocked/Done. Priorities: Low/Medium/High/Critical.

---

### Module 18: Expense Management

**Purpose:** Expense submission and approval workflow with receipt tracking.

---

## Section 3: Shared Infrastructure

### 3.1 Shared Components (40+ Shadcn/UI + 3 Custom)

See `_shared/components/COMPONENTS.md` for full details.

**Key Custom Components:**
- `sidebar.tsx` — Role-based navigation, different menus per role
- `searchable-employee-select.tsx` — Accessible searchable dropdown (cmdk)
- `theme-toggle.tsx` — Dark/light mode toggle

### 3.2 Shared Hooks

| Hook | Returns | Purpose |
|------|---------|---------|
| `use-auth.ts` | `{ user, isAdmin, isAuthenticated, login, logout }` | Auth state via TanStack Query |
| `use-toast.ts` | `{ toast() }` | Notification toasts |
| `use-mobile.tsx` | `isMobile: boolean` | Viewport detection |

### 3.3 Shared Libraries

| File | Purpose |
|------|---------|
| `queryClient.ts` | TanStack Query configuration, `apiRequest()` helper |
| `utils.ts` | `cn()` utility (clsx + tailwind-merge) |
| `auth.ts` | Client-side auth API utilities |

### 3.4 Middleware Chain

```
Request → Helmet (security headers) → Rate Limiter → Input Sanitizer → Content-Type Validator
→ Session Parser → Auth Check → Route Handler → Error Handler → Response
```

### 3.5 Server Utilities

| Utility | Purpose |
|---------|---------|
| `datetime.ts` | Philippine timezone (UTC+8), shift calculations |
| `geo.ts` | Haversine formula, geofencing validation |
| `validation.ts` | Zod schemas for API input validation |
| `logger.ts` | Structured logging with timestamps |
| `soft-delete.ts` | Soft delete utilities |

### 3.6 Configuration

| Config | Key Values |
|--------|-----------|
| Timezone | UTC+8 (Asia/Manila) |
| Working Days | 22/month |
| Grace Period | 15 minutes |
| Geofence Default | 100 meters |
| Session TTL | 7 days |
| Bcrypt Rounds | 12 |

See `_shared/config/CONFIG.md` and `_shared/config/env-variables.md` for complete details.

---

## Section 4: Database Schema Map

### 4.1 Complete Table Inventory (40+ Tables)

See `_shared/database/complete-schema.sql` for full DDL.

**Authentication (5 tables):**
- `users` — User accounts (email, passwordHash, role, isSuperadmin)
- `sessions` — PostgreSQL session store
- `roles` — Role definitions
- `permissions` — Permission rules (module + action)
- `user_permissions` — User-level grants with expiry

**Core Business (3 tables):**
- `employees` — Master records (50+ fields)
- `employee_documents` — Document attachments
- `employee_government_ids` — Government ID records

**Projects & Tasks (4 tables):**
- `projects` — Projects with geofencing
- `project_assignments` — Employee-to-project mapping
- `tasks` — Kanban tasks
- `task_comments` — Task discussion

**Attendance (2 tables):**
- `attendance_logs` — Clock-in/out with GPS, photos, verification
- `attendance_verifications` — Verification tracking

**Payroll (3 tables):**
- `payroll_records` — Computed payroll with all deductions
- `payroll_periods` — Cutoff period definitions
- `payslips` — Individual payslip records

**Leave (4 tables):**
- `leave_requests` — Leave requests with approval workflow
- `leave_types` — Leave type configuration
- `leave_allocations` — Per-employee balance tracking
- `holidays` — Company holiday calendar

**Cash Advances (2 tables):**
- `cash_advances` — Cash advance records with amortization
- `cash_advance_deductions` — Deduction schedule tracking

**Disciplinary (3 tables):**
- `disciplinary_records` — NTE records
- `disciplinary_explanations` — Employee responses
- `disciplinary_sanctions` — Sanction records

**Expenses (2 tables):**
- `expenses` — Expense records
- `expense_approvals` — Approval workflow

**Devotional (2 tables):**
- `devotionals` — Daily readings
- `devotional_reading_logs` — Reading progress

**System (2 tables):**
- `audit_logs` — Complete audit trail (JSONB old/new values)
- `company_settings` — Key-value configuration

### 4.2 Key Entity Relationships

```
users ──────────────── employees (user_id FK)
employees ──────────── employee_documents (employee_id FK)
employees ──────────── employee_government_ids (employee_id FK)
employees ──────────── attendance_logs (employee_id FK)
employees ──────────── payroll_records (employee_id FK)
employees ──────────── leave_requests (employee_id FK)
employees ──────────── cash_advances (employee_id FK)
employees ──────────── disciplinary_records (employee_id FK)
employees ──────────── expenses (requester_id FK)

projects ───────────── project_assignments (project_id FK)
projects ───────────── attendance_logs (project_id FK)
projects ───────────── tasks (project_id FK)

payroll_periods ────── payroll_records (payroll_period_id FK)
payroll_records ────── payslips (payroll_record_id FK)
payroll_records ────── cash_advance_deductions (payroll_record_id FK)

leave_types ────────── leave_requests (leave_type_id FK)
leave_types ────────── leave_allocations (leave_type_id FK)

tasks ──────────────── task_comments (task_id FK)

disciplinary_records ── disciplinary_explanations (disciplinary_id FK)
disciplinary_records ── disciplinary_sanctions (disciplinary_id FK)
```

### 4.3 Key Indexes

See `_shared/database/complete-schema.sql` for full index definitions. Key composite indexes:

| Index | Columns | Purpose |
|-------|---------|---------|
| idx_employee_status_role | status, role | Filter active employees by role |
| idx_attendance_employee_date | employee_id, scheduled_shift_date | Daily attendance lookup |
| idx_attendance_project_date | project_id, scheduled_shift_date | Project attendance reports |
| idx_leave_request_employee_status | employee_id, status | Pending leaves per employee |
| idx_expense_requester_status | requester_id, status | Employee expense approvals |

---

## Section 5: HRIS → Scholaris Transition Guide

### 5.1 Entity Mapping Table

| HRIS Entity | Scholaris Equivalent(s) | Notes |
|---|---|---|
| Employee | Faculty, Staff, Teacher | Split into multiple roles |
| Department | Department, Grade Level, Section | Hierarchical in school context |
| Position/Job Title | Faculty Rank, Staff Position | Different naming conventions |
| Employment Type | Employment Type (same for staff) | Full-time, Part-time, Probationary |
| Employee No | Faculty ID, Staff ID | Same pattern, different prefix |
| Leave Request | Faculty Leave, Student Absence Request | Two separate workflows |
| Cash Advance/Loan | Faculty/Staff Loan | Same logic, different eligibility rules |
| Payroll | Faculty Payroll | Same gov deductions for Philippine schools |
| Payslip | Payslip (Faculty), Statement of Account (Student) | Different output formats |
| NTE / Disciplinary | Student Discipline Record, Faculty Discipline | Different violation types |
| 201 File | Student 201 File, Faculty 201 File | Different document categories |
| Attendance (QR + Geo) | Faculty Attendance (QR + Geo), Student Attendance (Class-based) | Different tracking methods |
| Schedule | Class Schedule, Faculty Load, Room Assignment | Much more complex in school |
| Dashboard Widgets | Role-specific dashboards | Admin, Registrar, Faculty, Parent, Student |
| Employee Portal | Student Portal, Parent Portal, Faculty Portal | Three separate portals |
| Devotional | Chapel/Devotional (school-wide) | Same concept, broader audience |
| Notification | Notification (same pattern) | More recipient types |
| Audit Trail | Audit Trail (same) | Direct reuse |
| Permissions/Roles | Permissions/Roles (same pattern) | More roles: Admin, Registrar, Cashier, Faculty, Parent, Student |
| HR Settings | School Settings | Different configuration categories |
| Projects | Campuses/Buildings | Permanent locations |
| Tasks | Academic Tasks | Lesson planning, grading |
| Expenses | School Expenses, Department Budgets | Same workflow |

### 5.2 Module Reuse Assessment

| Module | Reuse Level | Strategy |
|--------|-------------|----------|
| 01 Dashboard | 🟡 ADAPT | Split into role-specific dashboards, change stat cards |
| 02 Employee Mgmt | 🟡 ADAPT | Rename to Faculty/Staff Mgmt, add school-specific fields |
| 03 Schedules | 🔴 INSPIRE | Complete rebuild for class scheduling with period/room/conflict logic |
| 04 Attendance | 🟡 ADAPT | Keep QR+GPS for faculty, add class-based for students |
| 05 201 Files | 🟡 ADAPT | Different document categories per role (student vs faculty) |
| 06 Leave Mgmt | 🟡 ADAPT | Add study leave, sabbatical; student absence separate |
| 07 Loans | 🟢 DIRECT | Minimal changes — faculty/staff loans |
| 08 Payroll | 🔴 INSPIRE | Keep gov deductions, add tuition billing (new logic) |
| 09 Disciplinary | 🟡 ADAPT | Different violation types for students vs faculty |
| 10 HR Settings | 🟡 ADAPT | School settings (academic year, grading periods, tuition) |
| 11 Devotional | 🟢 DIRECT | Same concept, broader audience |
| 12 Audit Trail | 🟢 DIRECT | Copy and use as-is |
| 13 Permissions | 🟢 DIRECT | Add more roles (Registrar, Cashier, Parent, Student) |
| 14 Notifications | 🔴 INSPIRE | Build from scratch using infrastructure patterns |
| 15 Employee Portal | 🟡 ADAPT | Split into Student, Parent, Faculty portals |
| 16 Projects | 🟡 ADAPT | Rename to Campuses/Buildings for geofencing |
| 17 Tasks | 🟡 ADAPT | Academic tasks (lesson planning, grading) |
| 18 Expenses | 🟢 DIRECT | Same approval workflow |

### 5.3 Find-and-Replace Mapping

**Core entity renaming (context-dependent):**
```
employee → student (student context) OR faculty (faculty context) OR staff (staff context)
employee_no → student_id OR faculty_id
department → grade_level (student) OR department (faculty)
position → section (student) OR faculty_rank (faculty)
employment_type → enrollment_status (student)
hire_date → enrollment_date (student) OR hire_date (faculty, same)
termination_date → withdrawal_date (student)
daily_rate → tuition_rate (billing context)
salary → tuition_fee (billing context)
payslip → statement_of_account (student billing)
payroll → tuition_billing (student context)
nte → discipline_record
cash_advance → faculty_loan OR staff_loan
project → campus OR building
project_assignment → campus_assignment
shift_start_time → class_start_time
shift_end_time → class_end_time
shift_work_days → class_days
```

### 5.4 New Features for Scholaris (Not in HRIS)

These modules need to be built from scratch:

1. **Enrollment Processing** — Application → Requirements → Assessment → Admission → Section Assignment
2. **Subject/Curriculum Management** — Subjects, grade-level curriculum, prerequisites
3. **Class Scheduling** — Period-based schedule builder with room/time conflict detection
4. **Grading System** — Quarterly grades, GPA computation, honor roll, transmutation tables
5. **Tuition Billing** — Installment plans, discounts, scholarships, payment tracking, SOA generation
6. **Parent Portal** — View child's grades, attendance, balance, announcements
7. **Student Portal** — View grades, schedule, balance, enrollment status
8. **Report Card Generation** — PDF report cards with school branding
9. **Academic Calendar** — School year, semester, grading periods, exam schedules
10. **Section/Class List Management** — Organize students into sections, manage class rosters

### 5.5 HRIS Features to Remove/Deprioritize for Scholaris

- **Complex payroll tax computations** — Simplify for faculty-only payroll
- **Geofencing attendance** — Keep QR, GPS optional for school context
- **Employment history tracking** — Replace with enrollment history for students
- **Project management** — Simplify to campus/building management
- **Kanban tasks** — May not be needed, or simplify for academic tasks
- **Overtime calculations** — May not apply to faculty

---

## Section 6: Integration Patterns

### 6.1 How Modules Communicate

The HRIS modules are interconnected through shared database tables and cross-module API calls:

```
                    ┌──────────────┐
                    │   Dashboard  │ ← reads from ALL modules
                    └──────┬───────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
┌──────────┐      ┌──────────────┐      ┌──────────────┐
│Attendance│─────→│   Payroll    │←─────│    Leave     │
│  System  │      │   System     │      │ Management   │
└──────────┘      └──────┬───────┘      └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │Cash Advances │
                  │   (Loans)    │
                  └──────────────┘
```

### 6.2 Payroll ← Attendance Integration

Payroll computation pulls from attendance_logs:
- Days worked = count of attendance records in period
- Overtime hours = sum of approved overtime minutes
- Late deductions = sum of deductible late minutes × daily rate / (8 × 60)

### 6.3 Payroll ← Leave Integration

- Approved leaves with `isPaid=false` → deducted from net pay
- Formula: `unpaidLeaveDays × dailyRate`

### 6.4 Payroll ← Cash Advance Integration

- Active (Disbursed) cash advances auto-deducted
- Per-cutoff: `min(deductionPerCutoff, remainingBalance)`
- Balance updated when payroll transitions Draft → Approved
- Auto-marked "Fully_Paid" when remaining = 0

### 6.5 Audit Trail Hooks

All CRUD operations should create audit_logs entries:
```typescript
await storage.createAuditLog({
  userId: req.user.id,
  action: "CREATE",
  entityType: "Employee",
  entityId: newEmployee.id,
  oldValues: null,
  newValues: newEmployee,
});
```

**Note:** Not consistently implemented in original HRIS — fix in Scholaris.

### 6.6 Permission Gating

**Server-side (mandatory):**
```typescript
router.post("/", isAuthenticated, hasRole("ADMIN", "HR"), handler);
```

**Client-side (UX convenience):**
```tsx
{isAdmin && <Route path="/employees" component={EmployeesPage} />}
```

### 6.7 Self-Service Portal Pattern

Employee portal reads from the same tables but filters by `employeeId = currentUser.employeeId`:
```typescript
router.get("/self-service/attendance", isAuthenticated, async (req, res) => {
  const employee = await storage.getEmployeeByUserId(req.user.id);
  const attendance = await storage.getAttendanceLogs(employee.id);
  res.json(attendance);
});
```

---

## Section 7: Code Pattern Reference

> Full code examples available in `_shared/CODE-PATTERNS.md`

### Pattern 1: CRUD Page Pattern
Standard list page with search, filter, create/edit dialog, delete confirmation.

### Pattern 2: Form Pattern
React Hook Form + Zod schema + Shadcn Form + useMutation.

### Pattern 3: DataTable Pattern
Column definitions with sorting/filtering, pagination, status badges, action menus.

### Pattern 4: API Route Pattern
Express route with isAuthenticated + hasRole + Zod validation + Drizzle ORM + asyncHandler.

### Pattern 5: Auth Check Pattern
Server middleware chain + client useAuth hook + role-based rendering.

### Pattern 6: Database Operations Pattern
Drizzle ORM SELECT/INSERT/UPDATE/soft-DELETE with type-safe operations.

### Pattern 7: Real-time Pattern (Planned)
WebSocket connection with ws library (infrastructure ready, not implemented).

### Pattern 8: File Upload Pattern
Multer middleware + document CRUD + type validation.

### Pattern 9: Approval Workflow Pattern
Status state machine: Pending → Approved/Rejected, used in Leave, Loans, Expenses, Payroll.

### Pattern 10: QR Code Pattern
Generation (qrcode library, data URL) + Scanning (html5-qrcode, rear camera, 10 FPS).

### Pattern 11: Geofencing Pattern
Haversine formula for GPS distance + radius check + multi-project loop.

### Pattern 12: Report/Export Pattern
xlsx library for Excel import/export + template download + bulk upload.

### Pattern 13: Search/Filter Pattern
Client search state + server query params + debounced input.

### Pattern 14: Toast/Notification Pattern
Radix toast for UI feedback + web push setup (VAPID keys).

### Pattern 15: Philippine Payroll Pattern
Complete SSS/PhilHealth/PagIBIG/TRAIN tax computation.

---

## Appendix A: Technical Debt to NOT Carry Over

These issues were identified in the HRIS audit and should be fixed in Scholaris:

| Issue | Severity | Fix in Scholaris |
|-------|----------|-----------------|
| Zero test coverage | 🔴 Critical | Set up Vitest + Playwright from Day 1 |
| Missing role auth on routes | 🔴 Critical | Apply hasRole to ALL mutation routes |
| N+1 queries in payroll | 🟠 High | Batch-fetch before loop |
| Photos in database (base64) | 🟠 High | Use cloud storage (S3/Supabase Storage) |
| Face verification not integrated | 🟠 High | Send results to server, store descriptors |
| Missing transactions | 🟡 Medium | Use Drizzle transactions for multi-step ops |
| Inconsistent error handling | 🟡 Medium | Use asyncHandler consistently |
| `as any` type assertions | 🔵 Low | Use proper Drizzle types |
| Debug console.logs | 🔵 Low | Use structured logger only |
| Weak password policy (6 chars) | 🟠 High | Require 8+ chars with complexity |
| Client-only route guards | 🟡 Medium | Always pair with server middleware |
| Inconsistent audit logging | 🟡 Medium | Hook into all CRUD operations |

## Appendix B: Recommended Scholaris Architecture Improvements

1. **Use Supabase instead of raw PostgreSQL** — Get auth, storage, real-time, and RLS out of the box
2. **Use Next.js App Router instead of Vite SPA** — Better SEO, SSR for public pages, RSC for data
3. **Add Zustand for client state** — Better for complex client-side state (enrollment wizard, class scheduler)
4. **Use Supabase Storage** — For documents, photos (not base64 in DB)
5. **Use Supabase Realtime** — For notifications, live updates
6. **Use Supabase RLS** — Row-level security instead of middleware-only auth
7. **Add comprehensive testing** — Unit tests for business logic, E2E for critical flows
8. **Use background jobs** — For payroll computation, report generation (not blocking API)
9. **Implement proper notification system** — Email + in-app + push
10. **Add API documentation** — OpenAPI/Swagger spec

---

*Blueprint generated from ElectroManage ERP codebase analysis (57,534 lines, 216 files, 40+ tables, ~149 endpoints)*
*For use as primary reference when building Scholaris Academy School Management System*
