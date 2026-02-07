# Module 02: Employee Management

## Purpose

Complete employee lifecycle management covering CRUD operations, document management, QR badge generation for attendance, government ID tracking, bulk import via Excel, and soft delete support. This is the foundational module that nearly every other module depends on -- employees are the central entity in the HRIS system.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| Employees.tsx | client/src/pages/Employees.tsx | Frontend | Employee list page with search, filter by status/role, sortable table |
| EmployeeDetail.tsx | client/src/pages/EmployeeDetail.tsx | Frontend | Full employee 201 file viewer with tabbed sections |
| EmployeeForm.tsx | client/src/pages/EmployeeForm.tsx | Frontend | Create/edit employee form with personal, employment, payroll, and shift fields |
| searchable-employee-select.tsx | client/src/components/searchable-employee-select.tsx | Frontend | Reusable searchable dropdown for employee selection (used by Tasks, Disciplinary, Attendance) |
| employees.ts | server/routes/employees.ts | Backend | Employee CRUD API with QR generation, documents, bulk upload |

## Key Features

- **Employee List**: Searchable, filterable table with columns for name, employee number, position, department, status, role
- **Search and Filter**: Text search across name/email/employee number; filter by status (Active, Probationary, Terminated, Suspended) and role (ADMIN, HR, ENGINEER, WORKER)
- **Create/Edit Form**: Comprehensive form with sections for personal info, employment details, payroll setup, and shift configuration
- **QR Code Generation**: Each employee gets a unique 32-character hex token (128-bit, cryptographic random) encoded as a QR code for attendance clock-in
- **QR Code Download**: QR codes can be viewed as base64 data URLs or downloaded as PNG files for badge printing
- **Bulk Import**: Upload employees via Excel spreadsheet using the downloadable template; uses `xlsx` library for parsing
- **Government ID Tracking**: Philippine government IDs -- SSS Number, TIN, PhilHealth Number, Pag-IBIG Number
- **Employee Statuses**: Active, Probationary, Terminated, Suspended -- with status-based filtering and payroll inclusion rules
- **Soft Delete Support**: Employees are never hard-deleted; a soft-delete flag preserves historical references in attendance, payroll, and disciplinary records
- **Document Management**: Upload and manage employee documents (government ID copies, contracts, certifications) attached to employee records
- **201 File Integration**: Complete employee file view aggregating personal info, employment records, payroll setup, disciplinary history, and documents

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/employees | All authenticated | List all employees with optional search and filter parameters |
| POST | /api/employees | ADMIN, HR | Create a new employee record with auto-generated QR token |
| GET | /api/employees/:id | All authenticated | Get a single employee by ID |
| PATCH | /api/employees/:id | ADMIN, HR | Update employee fields (partial update) |
| DELETE | /api/employees/:id | ADMIN, HR | Soft-delete an employee |
| GET | /api/employees/:id/complete-file | All authenticated | Get full 201 file: personal info + employment + payroll + disciplinary + documents |
| POST | /api/employees/:id/documents | ADMIN, HR | Upload a document attachment to an employee record |
| DELETE | /api/employees/:id/documents/:docId | ADMIN, HR | Remove a document from an employee record |
| GET | /api/employees/:id/qr-code | All authenticated | Get QR code as base64 data URL |
| GET | /api/employees/:id/qr-code/download | All authenticated | Download QR code as PNG file |
| POST | /api/employees/bulk-upload | ADMIN, HR | Bulk import employees from Excel file |
| GET | /api/employees/template/download | ADMIN, HR | Download Excel template for bulk import |

## Dependencies

### Internal Module Dependencies
- **_shared/hooks/use-auth** -- Role-based access control for create/edit/delete visibility
- **_shared/components/ui/*** -- Card, Table, Badge, Button, Input, Select, Dialog, Form, Tabs
- **_shared/lib/queryClient** -- TanStack Query for data fetching and mutation

### External Libraries
- **qrcode** (v1.5.4) -- Server-side QR code generation
- **html5-qrcode** (v2.3.8) -- Client-side QR scanning (used in attendance module)
- **xlsx** (v0.18.5) -- Excel file parsing for bulk import
- **React Hook Form** (v7.55.0) -- Form state management
- **Zod** (v3.24.2) -- Input validation schemas
- **crypto** (Node.js built-in) -- `randomBytes(16).toString('hex')` for QR token generation

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| employees | CRUD | id, employeeNo, firstName, lastName, middleName, email, phone, address, position, department, hireDate, status, role, sssNo, tinNo, philhealthNo, pagibigNo, dailyRate, monthlyRate, rateType, shiftStartTime, shiftEndTime, shiftWorkDays, qrToken, userId, deletedAt |
| employee_documents | Create, Read, Delete | id, employeeId, type, name, url, verified, uploadedAt |
| employee_government_ids | CRUD | id, employeeId, idType, idNumber, issuedDate, expiryDate |

### Key Database Indexes
- `idx_employee_no` -- Fast lookup by employee number
- `idx_employee_status` -- Filter by employment status
- `idx_employee_role` -- Filter by role
- `idx_employee_status_role` -- Composite index for status + role filtering
- Unique constraint on `email` and `qrToken`

## Business Logic Rules

| Rule | Description |
|------|-------------|
| QR Token Generation | `crypto.randomBytes(16).toString('hex')` produces a 32-char hex string; checked for uniqueness before saving |
| Employee Number Format | Auto-generated or manually assigned; must be unique |
| Status Transitions | Active <-> Probationary allowed freely; Terminated/Suspended requires ADMIN/HR action |
| Payroll Inclusion | Only Active and Probationary employees are included in payroll computation |
| Soft Delete | Sets `deletedAt` timestamp; employee remains in database for historical references |
| Rate Type | "daily" or "monthly"; monthly rate auto-converts to daily rate (monthly / 22 working days) for payroll |
| Required Fields | firstName, lastName, email, position, department, hireDate, status, role, rateType, dailyRate or monthlyRate |
| Government IDs | SSS, TIN, PhilHealth, Pag-IBIG numbers stored as strings; validated for format but not verified externally |

## Scholaris Adaptation Notes

- **Rename to Faculty/Staff Management**: Change "Employee" label throughout UI to "Faculty" or "Staff" based on context
- **Add academic fields**: gradeLevel, section, advisoryClass, subjectsTaught, teachingLoad
- **Add schoolYear and semester**: Link employee records to academic periods
- **Replace employeeNo with facultyId/staffId**: Different numbering scheme per school
- **Add license tracking**: PRC License Number, License Expiry Date for teachers
- **Keep government IDs**: SSS, TIN, PhilHealth, Pag-IBIG remain the same for Philippine schools
- **Modify roles**: ADMIN, REGISTRAR, FACULTY, STAFF instead of ADMIN, HR, ENGINEER, WORKER
- **Add contract type**: Regular, Probationary, Part-time, Substitute for faculty employment
- **QR codes remain useful**: Faculty attendance via QR clock-in at school gates
