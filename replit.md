# ElectroManage ERP

## Overview

ElectroManage is a full-stack Enterprise Resource Planning (ERP) system designed specifically for Philippine electrical contracting companies. The application manages workforce operations including employee management, biometric attendance tracking, and payroll processing with Philippine-specific government deductions (SSS, PhilHealth, Pag-IBIG, and withholding tax).

The system supports role-based access for Admin/HR, Engineers, and Workers, with features tailored to each role's responsibilities in managing multi-site electrical contracting operations.

## User Preferences

Preferred communication style: Simple, everyday language.

**IMPORTANT - Timezone**: All date and time transactions must use Philippine Local Timezone (UTC+8). This includes:
- Attendance clock-in/clock-out timestamps
- Payroll cutoff dates
- Any date/time stored in the database
- All time-related calculations and displays

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Shadcn/UI component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Form Handling**: React Hook Form with Zod validation

The frontend follows a page-based structure with reusable components. Key pages include:
- **Dashboard**: Enterprise overview with 7 stat cards (employees, attendance, payroll, projects, expenses, NTEs) and quick actions
- **Employees**: Full employee management with CRUD operations
- **Projects**: Project management with geo-fencing for attendance (client, locationName, deadline fields)
- **Tasks**: Kanban board with Todo/In Progress/Blocked/Done columns
- **Attendance**: Clock-in/out with photo verification and GPS geolocation
- **Payroll**: Payroll processing with Philippine government deductions
- **201 Files**: Complete employee records with tabs for Personal, Employment, Payroll, and Disciplinary history
- **Disciplinary**: NTE (Notice to Explain) workflow with 5-day response deadline
- **Expenses**: Expense submission and approval workflow

The application uses a sidebar navigation pattern with authenticated layouts, categorized into Operations, Human Resources, and Finance sections.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple

The server follows a modular structure with separate files for routes, storage operations, and authentication. The payroll calculator implements Philippine-specific tax tables and contribution calculations.

### Data Storage
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` for shared type definitions between client and server
- **Migrations**: Managed via drizzle-kit with migrations stored in `/migrations`

Key database tables (14 total):
- `users` and `sessions` for authentication (required for Replit Auth)
- `employees` for workforce data with Philippine government ID fields (employeeNo, sssNo, philhealthNo, pagibigNo, tinNo)
- `projects` for project management with geo-fencing (locationLat, locationLng, geoRadius)
- `project_assignments` for employee-to-project mapping
- `tasks` for Kanban task management (status: Todo, In_Progress, Blocked, Done)
- `attendance_logs` for time tracking with geolocation support
- `payroll_records` for payroll processing with deduction breakdowns
- `employee_documents` for 201 file document management
- `disciplinary_actions` for NTE workflow (status: Issued, Explanation_Received, Under_Review, Resolved, Escalated)
- `expenses` for expense approval workflow (status: Pending, Approved, Rejected, Reimbursed)

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: esbuild for server bundling, Vite for client bundling
- **Output**: Server bundled to `dist/index.cjs`, client to `dist/public/`

## External Dependencies

### Database
- PostgreSQL database (provisioned via Replit or external provider like Neon)
- Connection via `DATABASE_URL` environment variable

### Authentication
- Email/password authentication with bcrypt password hashing
- Session-based authentication stored in PostgreSQL
- CSRF protection on all state-changing requests
- Requires `SESSION_SECRET` and `SUPERADMIN_PASSWORD` environment variables

### Superadmin Account Management
- **Email**: `owner@jerejtech.com`
- **Password**: Configured via `SUPERADMIN_PASSWORD` secret (not hardcoded)
- **Seed Script**: `npx tsx server/seed-superadmin.ts`
  - Reads password from environment variable
  - Creates or updates superadmin account
  - Idempotent - safe to run multiple times
  - Works in both development and production

### Third-Party Libraries
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database operations
- **passport**: Authentication middleware
- **openid-client**: OIDC client for Replit Auth
- **connect-pg-simple**: PostgreSQL session store

### Attendance Tracking (QR Code System)
- QR code-based employee identification for clock-in/out
- Auto-generated 32-character hex tokens stored in `employees.qrToken`
- Downloadable QR badges (PNG format) for each employee
- Photo capture with webcam for clock-in/out verification
- GPS geolocation capture for work site verification
- Server-side geo-fencing validation using Haversine formula
- QR scanner built with html5-qrcode library for client-side scanning

### Philippine Payroll Tables
- SSS 2024/2025 contribution tables (implemented in `server/payroll-calculator.ts`)
- PhilHealth contribution rates
- Pag-IBIG contribution rates
- TRAIN Law withholding tax brackets

## Recent Changes

### January 2026 Enhancements
1. **HR Settings Page**: Added 4-tab configuration page
   - Payroll Cutoffs: Define semi-monthly/monthly cutoff periods
   - Contributions: Display SSS, PhilHealth, Pag-IBIG rates and OT multipliers
   - Leave Types: Configure vacation, sick, emergency leave allocations
   - Holidays: Manage regular and special non-working holidays

2. **Employee Management Enhancements**:
   - Shift schedule fields: shiftStartTime, shiftEndTime, shiftWorkDays
   - Reference face URL field for attendance verification

3. **Project Management**:
   - Added isOffice checkbox to distinguish office locations from project sites
   - Office locations do not have deadlines

4. **API Validation**:
   - Added Zod schema validation to all HR settings POST/PATCH routes

### HR Settings Database Tables (6 new)
- `payroll_cutoffs`: Semi-monthly cutoff schedules
- `leave_types`: Leave type configuration with annual allocation
- `leave_requests`: Employee leave requests with approval workflow
- `holidays`: Philippine holiday calendar by year
- `cash_advances`: Employee cash advance tracking
- `company_settings`: Key-value configuration store

### QR Code Attendance System (January 2026)
1. **QR Code Generation**:
   - Auto-generated 32-character hex tokens using crypto.randomBytes(16)
   - QR codes generated on-demand using `qrcode` library
   - Downloadable PNG badges with employee name and QR code

2. **Database Fields**:
   - `qrToken`: Unique 32-character hex token for each employee

3. **API Endpoints**:
   - GET `/api/employees/:id/qr-code`: Generate QR code data URL
   - GET `/api/employees/:id/qr-code/download`: Download QR badge as PNG
   - POST `/api/attendance/clock-in`: Validates QR token, GPS, captures photo

4. **Client-Side Scanner**:
   - html5-qrcode library for camera-based QR scanning
   - Scans JSON payload with token, name, employeeNo
   - Three-step flow: Scan → Photo → Success

### Role-Based Access Control (January 2026)
1. **User Roles**: ADMIN, HR, ENGINEER, WORKER

2. **Role-Specific Dashboards**:
   - Admin/HR: Enterprise dashboard with all stats
   - Engineer/Worker: Personal dashboard (my attendance, tasks, leave balance)

3. **Route Protection**:
   - Admin/HR-only routes: Employee CRUD, Payroll, HR Settings, Disciplinary
   - Employee self-service routes: /my-attendance, /my-tasks, /my-profile, /my-expenses

4. **API Protection**:
   - `hasRole("ADMIN", "HR")` middleware on sensitive endpoints
   - Employee self-service APIs: /api/my/attendance, /api/my/tasks, /api/my/leave-balance

5. **Sidebar Navigation**:
   - Dynamically filtered based on user role

### Full CRUD Operations (January 2026)
1. **Projects CRUD**:
   - Create/Edit/Delete with MapPicker for location selection
   - Interactive Leaflet map with click-to-pin and manual coordinate entry
   - Employee assignment panel with search/filter
   - Geo-fence radius configuration
   - API: GET/POST `/api/projects`, GET/PATCH/DELETE `/api/projects/:id`

2. **Employees CRUD**:
   - Create/Edit/Delete via dropdown menu actions
   - Integrated with QR badge generation and password management
   - API: GET/POST `/api/employees`, GET/PATCH/DELETE `/api/employees/:id`

3. **Tasks CRUD**:
   - Create/Edit/Delete with Kanban board
   - Employee assignee selector
   - Status change via dropdown (Todo, In_Progress, Blocked, Done)
   - API: GET/POST `/api/tasks`, GET/PATCH/DELETE `/api/tasks/:id`

4. **Attendance Edit**:
   - Admin/HR-only edit functionality via dropdown menu
   - Edit time in/out, late minutes, verification status
   - Auto-recalculates total hours
   - API: PATCH `/api/attendance/:id` (hasRole ADMIN/HR)

5. **UI Patterns**:
   - Consistent dropdown menu (MoreHorizontal icon) for row actions
   - AlertDialog for delete confirmations
   - Dialog for create/edit forms
   - MapPicker component with prop-sync and MapUpdater for location editing