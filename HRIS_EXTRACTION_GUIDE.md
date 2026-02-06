# HRIS System Extraction Guide

## Complete Blueprint for Cloning the ElectroManage HRIS

**Purpose:** This document provides everything a developer needs to replicate the HRIS system from the ElectroManage ERP codebase for use in other projects (e.g., a school management system).

**Original System:** ElectroManage ERP — Philippine HR/Payroll system for electrical contracting companies
**Target Use Case:** Any organization needing employee management, attendance, payroll, scheduling, and administrative workflows.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Complete File Inventory](#2-complete-file-inventory)
3. [Module-by-Module Breakdown](#3-module-by-module-breakdown)
4. [Database Schema (All 40+ Tables)](#4-database-schema)
5. [API Endpoint Reference (~149 Endpoints)](#5-api-endpoint-reference)
6. [Authentication & Authorization System](#6-authentication--authorization-system)
7. [Business Logic & Rules Engine](#7-business-logic--rules-engine)
8. [UI Component Library](#8-ui-component-library)
9. [Configuration & Environment](#9-configuration--environment)
10. [Step-by-Step Cloning Instructions](#10-step-by-step-cloning-instructions)
11. [School Adaptation Guide](#11-school-adaptation-guide)

---

## 1. ARCHITECTURE OVERVIEW

### Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React 18 + TypeScript | 18.3.1 | UI Framework |
| **Build Tool** | Vite | 7.3.0 | Dev server + bundling |
| **Routing** | Wouter | 3.3.5 | Client-side routing |
| **State** | TanStack React Query | 5.60.5 | Server state + caching |
| **Forms** | React Hook Form + Zod | 7.55.0 / 3.24.2 | Form handling + validation |
| **UI Library** | Shadcn/UI + Radix UI | Various | Component primitives |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS |
| **Charts** | Recharts | 2.15.2 | Data visualization |
| **Backend** | Express.js + TypeScript | 4.21.2 | API server |
| **ORM** | Drizzle ORM | 0.39.3 | Database operations |
| **Database** | PostgreSQL | 14+ | Data storage |
| **Auth** | Passport.js + bcrypt | 0.7.0 / 6.0.0 | Authentication |
| **Sessions** | express-session + connect-pg-simple | 1.18.2 / 10.0.0 | Session management |
| **Security** | Helmet + express-rate-limit | 8.1.0 / 8.2.1 | HTTP security |
| **QR Codes** | qrcode + html5-qrcode | 1.5.4 / 2.3.8 | QR generation + scanning |
| **Excel** | xlsx | 0.18.5 | Bulk import/export |
| **Animations** | Framer Motion | 11.13.1 | UI animations |

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React SPA)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Pages   │ │Components│ │  Hooks   │ │   Lib    │  │
│  │ (23 pgs) │ │ (63+ UI) │ │(useAuth) │ │(queryFn) │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                      │ HTTP/JSON                        │
├──────────────────────┼──────────────────────────────────┤
│                    SERVER (Express)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Routes   │ │Middleware │ │ Storage  │ │  Utils   │  │
│  │(14 mods) │ │(auth/sec)│ │(800+ ln) │ │(geo/time)│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                      │ Drizzle ORM                      │
├──────────────────────┼──────────────────────────────────┤
│                  DATABASE (PostgreSQL)                   │
│              40+ tables, 30+ indexes                    │
└─────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
project-root/
├── client/                          # Frontend React application
│   ├── index.html                   # Entry HTML (Vite)
│   └── src/
│       ├── App.tsx                  # Main app — routes, layout, Suspense
│       ├── index.css                # Global styles + CSS variables (theme)
│       ├── main.tsx                 # React DOM entry point
│       ├── components/
│       │   ├── ui/                  # 40+ Shadcn/UI components
│       │   ├── sidebar.tsx          # Navigation sidebar (role-based)
│       │   ├── searchable-employee-select.tsx
│       │   └── theme-toggle.tsx
│       ├── hooks/
│       │   ├── use-auth.ts          # Authentication hook
│       │   ├── use-toast.ts         # Toast notifications
│       │   └── use-mobile.tsx       # Responsive detection
│       ├── lib/
│       │   ├── queryClient.ts       # React Query config
│       │   ├── utils.ts             # cn() utility, helpers
│       │   └── auth.ts              # Auth utilities
│       └── pages/                   # 23 page components
│           ├── Dashboard.tsx
│           ├── Employees.tsx
│           ├── EmployeeDetail.tsx
│           ├── EmployeeForm.tsx
│           ├── Projects.tsx
│           ├── ProjectDetail.tsx
│           ├── Tasks.tsx
│           ├── TaskDetail.tsx
│           ├── Schedules.tsx
│           ├── Attendance.tsx
│           ├── ClockIn.tsx
│           ├── Payroll.tsx
│           ├── PayrollDetail.tsx
│           ├── Payslip.tsx
│           ├── TwoOhOneFiles.tsx     # 201 Files
│           ├── Disciplinary.tsx
│           ├── DisciplinaryDetail.tsx
│           ├── LeaveRequests.tsx
│           ├── LeaveForm.tsx
│           ├── CashAdvances.tsx
│           ├── CashAdvanceForm.tsx
│           ├── HRSettings.tsx
│           ├── Devotionals.tsx
│           ├── AuditTrail.tsx
│           ├── Landing.tsx           # Public landing page
│           ├── Login.tsx             # Login page
│           └── NotFound.tsx          # 404 page
├── server/                          # Backend Express application
│   ├── index.ts                     # Express app entry point
│   ├── db.ts                        # Drizzle database connection
│   ├── storage.ts                   # Database storage layer (800+ lines)
│   ├── email-auth.ts                # Session auth, CSRF, login/logout
│   ├── payroll-calculator.ts        # Philippine payroll computation
│   ├── static.ts                    # Static asset serving + cache headers
│   ├── seed-superadmin.ts           # Superadmin account seeder
│   ├── seed-permissions.ts          # Permission seeder
│   ├── config/
│   │   └── index.ts                 # Centralized config + env validation
│   ├── middleware/
│   │   ├── security.ts              # Helmet, rate limiting, sanitization
│   │   └── error-handler.ts         # AppError classes, asyncHandler
│   ├── routes/
│   │   ├── index.ts                 # Central route registration
│   │   ├── dashboard.ts             # Dashboard statistics
│   │   ├── employees.ts             # Employee CRUD, QR, documents
│   │   ├── projects.ts              # Project CRUD, assignments, geofence
│   │   ├── tasks.ts                 # Task CRUD, comments, Kanban
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
├── shared/                          # Shared between client + server
│   ├── schema.ts                    # Drizzle ORM schema (700+ lines, 40+ tables)
│   └── models/
│       └── auth.ts                  # Auth Zod schemas
├── migrations/                      # Drizzle-kit migration files
├── public/                          # Static public assets
│   └── models/                      # Face-api.js model files
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite build config
├── tailwind.config.ts               # Tailwind config
├── drizzle.config.ts                # Drizzle migration config
├── vitest.config.ts                 # Test config
├── components.json                  # Shadcn/UI config
└── .env.example                     # Environment template
```

---

## 2. COMPLETE FILE INVENTORY

### Files to Copy (by priority)

#### CRITICAL — Core Infrastructure (copy first)
| File | Lines | Purpose |
|------|-------|---------|
| `shared/schema.ts` | 700+ | ALL database table definitions |
| `shared/models/auth.ts` | ~80 | Auth Zod schemas |
| `server/db.ts` | ~20 | Database connection |
| `server/storage.ts` | 800+ | ALL database operations (CRUD) |
| `server/index.ts` | ~120 | Express app bootstrap |
| `server/email-auth.ts` | ~350 | Authentication system |
| `server/config/index.ts` | ~80 | Environment config + validation |
| `server/middleware/security.ts` | ~200 | Security middleware |
| `server/middleware/error-handler.ts` | ~150 | Error handling |
| `package.json` | 139 | All dependencies |
| `tsconfig.json` | 23 | TypeScript config |
| `vite.config.ts` | 51 | Vite build config |
| `tailwind.config.ts` | 107 | Tailwind theme |
| `drizzle.config.ts` | 14 | DB migration config |
| `components.json` | 20 | Shadcn/UI config |

#### CRITICAL — Frontend Framework
| File | Purpose |
|------|---------|
| `client/index.html` | Entry HTML |
| `client/src/main.tsx` | React entry |
| `client/src/App.tsx` | Routes, layout, Suspense, sidebar |
| `client/src/index.css` | Theme CSS variables, Tailwind base |
| `client/src/lib/queryClient.ts` | React Query configuration |
| `client/src/lib/utils.ts` | cn() utility and helpers |
| `client/src/lib/auth.ts` | Auth client utilities |
| `client/src/hooks/use-auth.ts` | useAuth() hook |
| `client/src/hooks/use-toast.ts` | Toast notification hook |
| `client/src/hooks/use-mobile.tsx` | Mobile detection hook |
| `client/src/components/sidebar.tsx` | Navigation sidebar |
| `client/src/components/ui/*` | ALL 40+ Shadcn/UI components |

#### MODULE FILES — Copy per module needed

**Dashboard**
| File | Purpose |
|------|---------|
| `client/src/pages/Dashboard.tsx` | Admin dashboard with stats |
| `server/routes/dashboard.ts` | Dashboard API |

**Employees + 201 Files**
| File | Purpose |
|------|---------|
| `client/src/pages/Employees.tsx` | Employee list |
| `client/src/pages/EmployeeDetail.tsx` | Employee 201 file viewer |
| `client/src/pages/EmployeeForm.tsx` | Create/edit employee |
| `client/src/pages/TwoOhOneFiles.tsx` | 201 Files page |
| `server/routes/employees.ts` | Employee CRUD API |
| `server/routes/documents.ts` | Document management API |

**Projects**
| File | Purpose |
|------|---------|
| `client/src/pages/Projects.tsx` | Project list |
| `client/src/pages/ProjectDetail.tsx` | Project detail + assignments |
| `server/routes/projects.ts` | Project CRUD API |

**Tasks**
| File | Purpose |
|------|---------|
| `client/src/pages/Tasks.tsx` | Kanban task board |
| `client/src/pages/TaskDetail.tsx` | Task detail + comments |
| `server/routes/tasks.ts` | Task CRUD API |

**Schedules**
| File | Purpose |
|------|---------|
| `client/src/pages/Schedules.tsx` | Schedule management |

**Attendance**
| File | Purpose |
|------|---------|
| `client/src/pages/Attendance.tsx` | Attendance records |
| `client/src/pages/ClockIn.tsx` | QR scanner + photo capture |
| `server/routes/attendance.ts` | Attendance API |
| `server/utils/geo.ts` | Geofencing (Haversine formula) |
| `server/utils/datetime.ts` | Philippine timezone utilities |

**Payroll**
| File | Purpose |
|------|---------|
| `client/src/pages/Payroll.tsx` | Payroll list |
| `client/src/pages/PayrollDetail.tsx` | Payroll computation detail |
| `client/src/pages/Payslip.tsx` | Individual payslip view |
| `server/routes/payroll.ts` | Payroll computation API |
| `server/routes/payroll-periods.ts` | Period management API |
| `server/routes/payslips.ts` | Payslip API |
| `server/payroll-calculator.ts` | ALL payroll math (SSS, PhilHealth, Pag-IBIG, tax) |

**Disciplinary**
| File | Purpose |
|------|---------|
| `client/src/pages/Disciplinary.tsx` | NTE list |
| `client/src/pages/DisciplinaryDetail.tsx` | NTE detail + resolution |
| `server/routes/disciplinary.ts` | Disciplinary API |

**Leave & Loans**
| File | Purpose |
|------|---------|
| `client/src/pages/LeaveRequests.tsx` | Leave request list |
| `client/src/pages/LeaveForm.tsx` | Leave request form |
| `client/src/pages/CashAdvances.tsx` | Cash advance list |
| `client/src/pages/CashAdvanceForm.tsx` | Cash advance form |
| `server/routes/leave-requests.ts` | Leave API |
| `server/routes/cash-advances.ts` | Cash advance API |

**HR Settings**
| File | Purpose |
|------|---------|
| `client/src/pages/HRSettings.tsx` | 4-tab settings page |
| `server/routes/hr-settings.ts` | Settings API |

**Devotionals**
| File | Purpose |
|------|---------|
| `client/src/pages/Devotionals.tsx` | Daily devotional |

**Audit Trail**
| File | Purpose |
|------|---------|
| `client/src/pages/AuditTrail.tsx` | Audit log viewer |

**Employee Self-Service Portal**
| File | Purpose |
|------|---------|
| `server/routes/employee-self-service.ts` | Employee portal APIs |
| Various `client/src/pages/My*.tsx` | Employee self-service pages |

---

## 3. MODULE-BY-MODULE BREAKDOWN

### 3.1 Dashboard

**What it does:** Enterprise overview with statistics cards, attendance trends, payroll summary, and quick actions.

**Key Components:**
- 7 stat cards: total employees, today's attendance, active projects, pending tasks, payroll, pending expenses, active NTEs
- Quick action buttons: clock-in, new employee, run payroll
- Role-based: Admin/HR sees everything, Workers see personal dashboard

**API:**
```
GET /api/dashboard/statistics    → { totalEmployees, todayAttendance, ... }
GET /api/dashboard/metrics       → Charts data
GET /api/dashboard/overview      → Summary
```

### 3.2 Employees

**What it does:** Complete employee lifecycle management with CRUD, document management, QR badge generation, and government ID tracking.

**Key Features:**
- Employee list with search, filter by status/role
- Create/edit form with personal, employment, payroll, and shift fields
- QR code generation (32-char hex token) for attendance
- Bulk import via Excel template
- Government IDs: SSS, TIN, PhilHealth, Pag-IBIG
- Employee statuses: Active, Probationary, Terminated, Suspended

**API:**
```
GET    /api/employees                              → List all
POST   /api/employees                              → Create
GET    /api/employees/:id                          → Get by ID
PATCH  /api/employees/:id                          → Update
DELETE /api/employees/:id                          → Delete (soft)
GET    /api/employees/:id/complete-file            → Full 201 file
POST   /api/employees/:id/documents                → Upload document
DELETE /api/employees/:id/documents/:docId         → Delete document
GET    /api/employees/:id/qr-code                  → QR data URL
GET    /api/employees/:id/qr-code/download         → QR PNG download
POST   /api/employees/bulk-upload                  → Excel import
GET    /api/employees/template/download            → Download template
```

### 3.3 Projects

**What it does:** Multi-site project management with geofencing for attendance validation.

**Key Features:**
- Project CRUD with map-based location picker (Leaflet)
- Geofence configuration (center point + radius in meters)
- Employee assignment to projects
- Office vs. Project distinction (offices have no deadline)
- Status workflow: Planning → Active → On Hold → Completed → Cancelled

**API:**
```
GET    /api/projects                               → List all
POST   /api/projects                               → Create
GET    /api/projects/:id                           → Get details
PATCH  /api/projects/:id                           → Update
DELETE /api/projects/:id                           → Delete
GET    /api/projects/:id/assignments               → Get assignments
POST   /api/projects/:id/assignments               → Create assignment
PATCH  /api/projects/:id/assignments/:empId        → Update assignment
```

### 3.4 Tasks (Kanban)

**What it does:** Kanban-style task board with status tracking and comments.

**Statuses:** Todo → In_Progress → Blocked → Done
**Priorities:** Low, Medium, High, Critical

**API:**
```
GET    /api/tasks                                  → List all
POST   /api/tasks                                  → Create
GET    /api/tasks/:id                              → Get details
PATCH  /api/tasks/:id                              → Update
DELETE /api/tasks/:id                              → Delete
POST   /api/tasks/:id/comments                     → Add comment
GET    /api/tasks/:id/comments                     → Get comments
```

### 3.5 Schedules

**What it does:** Shift scheduling with day/night shift support.

**Shift Types:**
- Day Shift: 06:00 - 21:59
- Night Shift: 22:00 - 05:59

**Key Fields on Employee:**
- `shiftStartTime` (e.g., "08:00")
- `shiftEndTime` (e.g., "17:00")
- `shiftWorkDays` (e.g., "Mon,Tue,Wed,Thu,Fri")

### 3.6 Attendance

**What it does:** QR-based clock-in/out with GPS geofencing, photo capture, face detection, and tardiness tracking.

**Clock-in Flow:**
1. Employee scans QR code → validates token → finds employee
2. Auto-detect shift type (day/night based on clock-in hour)
3. Check for duplicate clock-in
4. Verify active project assignment exists
5. **Geofence check** — loop all assigned projects, verify GPS within radius
6. Calculate tardiness (15-minute grace period)
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

**API:**
```
GET    /api/attendance/today                       → Today's records
POST   /api/attendance/clock-in                    → Clock in (QR + GPS + photo)
POST   /api/attendance/clock-out                   → Clock out
PATCH  /api/attendance/:id                         → Edit record (admin)
POST   /api/attendance/bulk-upload                 → Excel import
GET    /api/attendance/template/download            → Download template
POST   /api/attendance/:id/justification           → Off-site justification
```

### 3.7 Payroll

**What it does:** Automated payroll computation with Philippine government deductions.

**Salary Calculation:**
```
Basic Pay = Days Worked × Daily Rate
Standard: 22 working days/month
```

**Overtime Multipliers:**
| Type | Multiplier |
|------|-----------|
| Regular | 1.25x |
| Rest Day | 1.30x |
| Holiday | 2.00x |

**Government Deductions (Philippine 2024/2025):**
- **SSS:** 57 salary brackets (₱4,000-₱30,000+ MSC), max semi-monthly ₱675
- **PhilHealth:** 5% of basic (2.5% employee), floor ₱10,000, ceiling ₱100,000, max ₱1,250/semi-monthly
- **Pag-IBIG:** 1-2% based on salary, max MSC ₱5,000, max ₱50/semi-monthly
- **Withholding Tax:** TRAIN Law — 6 progressive brackets (0%, 15%, 20%, 25%, 30%, 35%)

**Payroll Status Workflow:**
```
DRAFT → APPROVED → RELEASED
```

**API:**
```
GET    /api/payroll                                → List records
POST   /api/payroll/generate                       → Compute payroll for period
GET    /api/payroll/:id                            → Get details
PATCH  /api/payroll/:id/approve                    → Approve
PATCH  /api/payroll/:id/release                    → Release/process
GET    /api/payroll/:id/summary                    → Summary
POST   /api/payroll/periods                        → Create period
GET    /api/payroll/periods                        → List periods
GET    /api/payslips/:id                           → Get payslip
POST   /api/payslips/:id/email                     → Email payslip
```

### 3.8 201 Files

**What it does:** Complete employee record compilation — the "201 File" is the Philippine standard for complete employee records.

**Sections:**
1. Personal Information (name, address, contacts, government IDs)
2. Employment Records (position, department, hire date, status)
3. Payroll Setup (rate type, daily/monthly rate, deductions)
4. Disciplinary History (NTEs, sanctions)
5. Documents (uploaded files, government ID copies)

### 3.9 Disciplinary

**What it does:** NTE (Notice to Explain) workflow for employee discipline.

**Workflow:**
```
Issued → Explanation_Received → Resolved
(5-day response deadline)
```

**Sanctions:** Verbal warning, written warning, suspension, termination

**API:**
```
GET    /api/disciplinary                           → List NTEs
POST   /api/disciplinary                           → Issue NTE
GET    /api/disciplinary/:id                       → Get details
PATCH  /api/disciplinary/:id                       → Update
POST   /api/disciplinary/:id/explanation           → Submit explanation
PATCH  /api/disciplinary/:id/resolve               → Resolve with decision
```

### 3.10 Leave & Loans

**Leave Types:** Sick, Vacation, Bereavement, Maternity, Paternity, Emergency
**Accrual Modes:** Annual (full Day 1) or Monthly (gradual)

**Leave API:**
```
GET    /api/leave-requests                         → List requests
POST   /api/leave-requests                         → Create request
GET    /api/leave-requests/:id                     → Get details
PATCH  /api/leave-requests/:id/approve             → Approve
PATCH  /api/leave-requests/:id/reject              → Reject
PATCH  /api/leave-requests/:id/cancel              → Cancel
GET    /api/leave-types                            → Available types
```

**Cash Advance API:**
```
GET    /api/cash-advances                          → List advances
POST   /api/cash-advances                          → Request advance
PATCH  /api/cash-advances/:id/approve              → Approve
PATCH  /api/cash-advances/:id/disburse             → Disburse
PATCH  /api/cash-advances/:id/reject               → Reject
```

**Cash Advance ↔ Payroll Integration:**
- Auto-deducted during payroll: `min(deductionPerCutoff, remainingBalance)`
- Auto-marked "Fully_Paid" when balance reaches zero

### 3.11 HR Settings

**4 Tabs:**
1. **Payroll Cutoffs** — Define semi-monthly/monthly cutoff periods
2. **Contributions** — View SSS, PhilHealth, Pag-IBIG rates and OT multipliers
3. **Leave Types** — Configure leave types and annual allocations
4. **Holidays** — Manage regular and special non-working holidays

**API:**
```
GET    /api/hr-settings                            → Get all settings
POST   /api/hr-settings/payroll-cutoffs            → Create cutoff
GET    /api/hr-settings/payroll-cutoffs            → List cutoffs
PATCH  /api/hr-settings/payroll-cutoffs/:id        → Update cutoff
DELETE /api/hr-settings/payroll-cutoffs/:id        → Delete cutoff
POST   /api/hr-settings/leave-types                → Create leave type
GET    /api/hr-settings/leave-types                → List types
PATCH  /api/hr-settings/leave-types/:id            → Update type
POST   /api/hr-settings/holidays                   → Create holiday
GET    /api/hr-settings/holidays                   → List holidays
PATCH  /api/hr-settings/company-info               → Update company info
```

### 3.12 Devotionals

**What it does:** Daily devotional content for employee spiritual wellness.

**API:**
```
GET    /api/devotionals                            → Today's devotional
GET    /api/devotionals/admin/all                  → List all (admin)
POST   /api/devotionals                            → Create (admin)
PATCH  /api/devotionals/:id                        → Update (admin)
DELETE /api/devotionals/:id                        → Delete (admin)
POST   /api/devotionals/:id/mark-read              → Mark as read
```

### 3.13 Audit Trail

**What it does:** Comprehensive logging of all sensitive operations.

**Actions tracked:** CREATE, READ, UPDATE, DELETE, APPROVE, RELEASE
**Entity types:** Employee, Payroll, Leave, CashAdvance, Disciplinary, etc.

**API:**
```
GET    /api/audit-logs                             → List logs
GET    /api/audit-logs/:id                         → Get details
```

---

## 4. DATABASE SCHEMA

### Core Tables (copy from `shared/schema.ts`)

```typescript
// ============ AUTHENTICATION ============
users                    // User accounts (id, email, passwordHash, role, isSuperadmin)
sessions                 // Session storage (sid, sess, expire)
roles                    // Role definitions (id, name, description)
permissions              // Permission rules (id, module, action, description)
userPermissions          // User-level permission grants

// ============ EMPLOYEES ============
employees                // Master records (50+ fields)
                         // name, email, phone, address, employeeNo
                         // position, department, hireDate, status
                         // sssNo, philhealthNo, pagibigNo, tinNo
                         // dailyRate, monthlyRate, rateType
                         // shiftStartTime, shiftEndTime, shiftWorkDays
                         // qrToken (32-char hex for attendance)
                         // role (ADMIN, HR, ENGINEER, WORKER)

employeeDocuments        // Document attachments (type, url, verified)
employeeGovernmentIds    // Government ID records

// ============ PROJECTS ============
projects                 // Projects (name, code, isOffice, locationLat/Lng, geoRadius, status)
projectAssignments       // Employee-to-project mapping

// ============ TASKS ============
tasks                    // Kanban tasks (title, description, status, priority, assignedTo, dueDate)
taskComments             // Task discussion comments

// ============ ATTENDANCE ============
attendanceLogs           // Clock-in/out records
                         // employeeId, projectId, timeIn, timeOut
                         // gpsLatitude, gpsLongitude, gpsAccuracy
                         // photoSnapshotUrl (base64 JPEG)
                         // verificationStatus (Verified/Off-site/Pending/Flagged)
                         // lateMinutes, lateDeductible
                         // overtimeMinutes, otStatus, isOvertimeSession
                         // scheduledShiftDate, actualShiftType
                         // lunchDeductionMinutes, totalWorkingMinutes

attendanceVerifications  // Verification status tracking

// ============ PAYROLL ============
payrollRecords           // Payroll computation results
                         // basicPay, overtimePay, grossPay
                         // sssDeduction, philhealthDeduction, pagibigDeduction
                         // withholdingTax, totalDeductions, netPay
                         // status (DRAFT/APPROVED/RELEASED)

payrollPeriods           // Cutoff period definitions
payslips                 // Individual payslip records

// ============ LEAVE MANAGEMENT ============
leaveRequests            // Leave request records (type, startDate, endDate, status, remarks)
leaveTypes               // Leave type configuration (name, daysPerYear, isPaid, accrualMode)
leaveAllocations         // Employee leave balance tracking
holidays                 // Company holiday calendar (date, name, type, year)

// ============ CASH ADVANCES ============
cashAdvances             // Cash advance records (amount, deductionPerCutoff, remainingBalance, status)
cashAdvanceDeductions    // Deduction schedule tracking

// ============ DISCIPLINARY ============
disciplinaryRecords      // NTE records (violation, dateIssued, deadline, status)
disciplinaryExplanations // Employee explanations
disciplinarySanctions    // Sanction records (type, startDate, endDate)

// ============ EXPENSES ============
expenses                 // Expense records (amount, category, status)
expenseApprovals         // Approval workflow

// ============ DEVOTIONALS ============
devotionals              // Daily readings (title, content, date)
devotionalReadingLogs    // Employee reading progress

// ============ SYSTEM ============
auditLogs                // Complete audit trail (action, entityType, entityId, oldValues, newValues)
companySettings          // Key-value system configuration
```

### Key Database Indexes

```typescript
// Employee lookups
idx_employee_no             (employee_no)
idx_employee_status         (status)
idx_employee_role           (role)
idx_employee_status_role    (status, role)

// Attendance performance
idx_attendance_employee_date  (employee_id, scheduled_shift_date)
idx_attendance_project_date   (project_id, scheduled_shift_date)

// Leave workflow
idx_leave_request_employee         (employee_id)
idx_leave_request_status           (status)
idx_leave_request_dates            (start_date, end_date)
idx_leave_request_employee_status  (employee_id, status)

// Cash advances
idx_cash_advance_employee  (employee_id)
idx_cash_advance_status    (status)

// Holidays
idx_holiday_year  (year)
idx_holiday_date  (date)

// Expenses
idx_expense_requester_status  (requester_id, status)
```

---

## 5. API ENDPOINT REFERENCE

### Complete Endpoint Map (~149 total)

See Section 3 for per-module endpoint details. Summary:

| Module | Endpoints | Auth Required |
|--------|-----------|---------------|
| Auth | 5 | No (login), Yes (others) |
| Dashboard | 3 | Yes |
| Employees | 12 | Yes (Admin/HR for mutations) |
| Projects | 8 | Yes |
| Tasks | 7 | Yes |
| Attendance | 7 | Yes |
| Payroll | 9 | Yes (Admin/HR for approve/release) |
| Disciplinary | 6 | Yes |
| Leave | 7 | Yes |
| Cash Advances | 6 | Yes |
| HR Settings | 11 | Yes (Admin/HR) |
| Devotionals | 6 | Yes |
| Audit Logs | 2 | Yes (Admin) |
| Self-Service | ~15 | Yes (own data only) |
| Health | 3 | No |
| **Total** | **~107+** | |

---

## 6. AUTHENTICATION & AUTHORIZATION SYSTEM

### Session-Based Auth

```
1. User submits email + password
2. Server validates with bcrypt (12 salt rounds)
3. Session created in PostgreSQL (7-day TTL)
4. CSRF token issued
5. Session cookie set (httpOnly, secure in prod, sameSite: lax)
```

### Role-Based Access Control

**Roles:** ADMIN, HR, ENGINEER, WORKER

**Middleware Pattern:**
```typescript
import { isAuthenticated, hasRole } from "../email-auth";

// Any logged-in user
router.get("/", isAuthenticated, handler);

// Admin/HR only
router.post("/", isAuthenticated, hasRole("ADMIN", "HR"), handler);
```

**Permission System:**
- Superadmin bypasses ALL permission checks
- Users have role-based permissions
- Individual permission grants (overrides)
- Permission expiry support
- 5-minute cache TTL

### Rate Limiting

| Endpoint | Window | Max |
|----------|--------|-----|
| Global API | 15 min | 1000 |
| Login | 15 min | 10 |
| Password change | 1 hour | 3 |
| Write operations | 1 min | 60 |

---

## 7. BUSINESS LOGIC & RULES ENGINE

### Attendance Rules Truth Table

| Condition | Action | Outcome |
|-----------|--------|---------|
| Clock-in within geofence | Accept | verificationStatus = "Verified" |
| Clock-in outside ALL geofences | REJECT | Error 400, no record created |
| No active project assignment | REJECT | "No active assignment" |
| Already clocked in | REJECT | "Already clocked in" |
| Completed shift + clock-in again | Accept as OT | isOvertimeSession = true |
| Clock-in 22:00-05:59 | Auto-detect | actualShiftType = "night" |
| Late < 15 minutes | Record, non-deductible | lateDeductible = false |
| Late >= 15 minutes | Record, deductible | lateDeductible = true |
| Worked >= 5 hours | Lunch deduction | lunchDeductionMinutes = 60 |
| Worked < 5 hours | No deduction | lunchDeductionMinutes = 0 |
| Overtime detected | Requires approval | otStatus = "Pending" |

### Payroll Rules

| Condition | Outcome |
|-----------|---------|
| Employee Active/Probationary | Included in payroll |
| Employee Terminated/Suspended | EXCLUDED |
| OT status "Approved" | Added to gross with multiplier |
| OT status "Pending"/"Rejected" | EXCLUDED from pay |
| Leave isPaid = false | `days × dailyRate` deducted |
| Cash advance balance > 0 | `min(perCutoff, remaining)` deducted |

### Leave Rules

| Condition | Outcome |
|-----------|---------|
| Submit request | status = "Pending" |
| Approve (HR/Admin) | status = "Approved", allocation updated |
| Reject (HR/Admin) | status = "Rejected", requires remarks |
| Cancel own pending | status = "Cancelled" |
| Cancel own approved | REJECTED — contact HR |
| Annual accrual | Full allocation Day 1 |
| Monthly accrual | `(total/12) × completedMonths` |

### Disciplinary Rules

| Condition | Outcome |
|-----------|---------|
| Issue NTE (HR/Admin) | status = "Issued", deadline = today + 5 days |
| Submit explanation (self) | status = "Explanation_Received" |
| Resolve (HR/Admin) | status = "Resolved", sanction recorded |
| Regular employee view | Own records only |

### Cash Advance Rules

| Condition | Outcome |
|-----------|---------|
| Submit request | status = "Pending" |
| Approve (HR/Admin) | status = "Approved", deduction schedule set |
| deductionPerCutoff > amount | REJECTED — invalid |
| Disburse | status = "Disbursed" |
| remainingBalance = 0 | Auto "Fully_Paid" |

---

## 8. UI COMPONENT LIBRARY

### Shadcn/UI Components (40+)

All in `client/src/components/ui/`:

**Form:** button, input, textarea, select, checkbox, radio-group, switch, slider, label, form
**Display:** badge, avatar, alert, card, table, separator, progress, aspect-ratio
**Navigation:** tabs, accordion, breadcrumb, navigation-menu, menubar
**Overlay:** dialog, popover, tooltip, hover-card, dropdown-menu, context-menu, alert-dialog, sheet
**Feedback:** toast, toaster, sonner
**Data Entry:** calendar, date-picker, input-otp, command (cmdk)
**Layout:** scroll-area, resizable-panels, collapsible, carousel
**Toggle:** toggle, toggle-group

### Custom Components

| Component | Purpose |
|-----------|---------|
| `sidebar.tsx` | Role-based navigation sidebar |
| `searchable-employee-select.tsx` | Searchable employee dropdown |
| `theme-toggle.tsx` | Dark/light mode toggle |

---

## 9. CONFIGURATION & ENVIRONMENT

### Required Environment Variables

```bash
# REQUIRED
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=<min 32 characters — generate with: openssl rand -hex 32>

# OPTIONAL
NODE_ENV=production          # development | production | test
PORT=5000                    # Server port (default: 5000)
SENTRY_DSN=                  # Error tracking
VITE_SENTRY_DSN=             # Frontend error tracking
VITE_GOOGLE_MAPS_API_KEY=    # Google Maps (for location picker)
EMAIL_ENABLED=false          # Enable email features
RESEND_API_KEY=              # Resend email service
VAPID_PUBLIC_KEY=            # Web push notifications
VAPID_PRIVATE_KEY=           # Web push notifications
```

### Configuration Constants (server/config/index.ts)

```typescript
{
  timezone: { offsetHours: 8, name: "Asia/Manila" },
  payroll: { workingDaysPerMonth: 22, defaultGraceMinutes: 15 },
  geofence: { defaultRadiusMeters: 100 },
  session: { ttl: 7 * 24 * 60 * 60 * 1000 },  // 7 days
  bcrypt: { saltRounds: 12 },
}
```

---

## 10. STEP-BY-STEP CLONING INSTRUCTIONS

### Phase 1: Project Setup

```bash
# 1. Create new project directory
mkdir my-school-hris && cd my-school-hris
git init

# 2. Copy configuration files from source
cp SOURCE/package.json .
cp SOURCE/tsconfig.json .
cp SOURCE/vite.config.ts .
cp SOURCE/tailwind.config.ts .
cp SOURCE/drizzle.config.ts .
cp SOURCE/vitest.config.ts .
cp SOURCE/components.json .
cp SOURCE/.env.example .

# 3. Install dependencies
npm install

# 4. Remove Replit-specific dependencies (optional)
npm uninstall @replit/object-storage @replit/vite-plugin-cartographer \
  @replit/vite-plugin-dev-banner @replit/vite-plugin-runtime-error-modal
```

### Phase 2: Copy Core Files

```bash
# 5. Copy shared schema
mkdir -p shared/models
cp SOURCE/shared/schema.ts shared/
cp SOURCE/shared/models/auth.ts shared/models/

# 6. Copy server
mkdir -p server/{config,middleware,routes,utils}
cp SOURCE/server/index.ts server/
cp SOURCE/server/db.ts server/
cp SOURCE/server/storage.ts server/
cp SOURCE/server/email-auth.ts server/
cp SOURCE/server/payroll-calculator.ts server/
cp SOURCE/server/static.ts server/
cp SOURCE/server/config/index.ts server/config/
cp SOURCE/server/middleware/*.ts server/middleware/
cp SOURCE/server/routes/*.ts server/routes/
cp SOURCE/server/utils/*.ts server/utils/
cp SOURCE/server/seed-superadmin.ts server/
cp SOURCE/server/seed-permissions.ts server/

# 7. Copy client
mkdir -p client/src/{components/ui,hooks,lib,pages}
cp SOURCE/client/index.html client/
cp SOURCE/client/src/main.tsx client/src/
cp SOURCE/client/src/App.tsx client/src/
cp SOURCE/client/src/index.css client/src/
cp -r SOURCE/client/src/components/ client/src/components/
cp -r SOURCE/client/src/hooks/ client/src/hooks/
cp -r SOURCE/client/src/lib/ client/src/lib/
cp -r SOURCE/client/src/pages/ client/src/pages/
```

### Phase 3: Configure for Your Environment

```bash
# 8. Create .env file
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# 9. Clean Replit-specific code from vite.config.ts
# Remove @replit plugin imports and REPL_ID conditionals

# 10. Push schema to database
npm run db:push

# 11. Seed superadmin account
SUPERADMIN_PASSWORD=YourSecurePassword123! npx tsx server/seed-superadmin.ts

# 12. Start development
npm run dev
```

### Phase 4: Customize

See Section 11 for school-specific adaptations.

---

## 11. SCHOOL ADAPTATION GUIDE

### Terminology Mapping

| HRIS Term | School Equivalent | Notes |
|-----------|-------------------|-------|
| Employee | Faculty / Staff | Change throughout UI |
| Employee No | Faculty ID / Staff ID | Unique identifier |
| Department | Department / Grade Level | Academic organization |
| Position | Role / Designation | Teaching position |
| Projects | Campuses / Departments | Physical locations |
| Project Assignment | Campus/Dept Assignment | Faculty placement |
| Tasks | Academic Tasks | Lesson planning, grading, etc. |
| Schedules | Class Schedules / Teaching Load | Period-based schedules |
| Attendance | Faculty/Staff Attendance | Daily check-in |
| Clock-In | Check-In | QR-based or biometric |
| Payroll | Faculty/Staff Payroll | Monthly salary computation |
| 201 Files | Personnel Files | Same concept in schools |
| Disciplinary | Incident Reports | For staff conduct |
| Leave | Leave of Absence | Same concept |
| Cash Advances | Salary Advances | Same concept |
| Devotionals | Morning Assembly / Announcements | Daily communications |
| Geofence | Campus Boundary | School premises |
| NTE (Notice to Explain) | Show Cause Letter | Administrative process |
| HR Settings | School Settings | System configuration |
| Daily Rate | Daily Rate / Hourly Rate | Compensation basis |

### What to Change

**1. Schema changes (`shared/schema.ts`):**
- Add `gradeLevel`, `section`, `advisoryClass` fields to employees
- Add `schoolYear`, `semester` fields to relevant tables
- Rename `projects` table to `campuses` or keep as is

**2. Payroll customization (`server/payroll-calculator.ts`):**
- Philippine government deductions remain the same (SSS, PhilHealth, Pag-IBIG, tax)
- Adjust working days if school uses different schedule
- Add school-specific allowances (chalk allowance, teaching load differential)

**3. UI text changes:**
- Update sidebar labels
- Update page titles and breadcrumbs
- Update form field labels
- Update confirmation messages

**4. Leave types:**
- Add: Study Leave, Sabbatical, Semestral Break
- Keep: Sick, Vacation, Maternity, Paternity

**5. Schedule enhancements:**
- Add period-based scheduling (Period 1: 7:30-8:30, Period 2: 8:30-9:30, etc.)
- Add room assignments
- Add subject mapping

**6. New modules to consider adding:**
- Student management (optional, separate from HR)
- Class schedule builder
- Faculty evaluation tracking
- Training/PD (Professional Development) records

---

## SUMMARY

This guide provides the complete blueprint for extracting and replicating the HRIS system. The key files total approximately **57,534 lines of TypeScript across 216 files**. The system requires only **PostgreSQL** as an external dependency and can be deployed to any Node.js hosting platform.

**Minimum viable extraction:** Copy the 15 Critical Infrastructure files + the modules you need from the Module Files section. The system is modular — you can include only the modules relevant to your use case.

**For a school deployment:** Start with Employees, Attendance, Payroll, Schedules, Leave, and HR Settings. Add Disciplinary, Tasks, and 201 Files as needed. The Devotionals module maps well to morning announcements or school-wide communications.
