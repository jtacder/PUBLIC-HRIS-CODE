# Module 05: 201 Files

## Purpose

Philippine-standard employee records compilation known as the "201 File." This module provides a comprehensive, read-heavy view of an employee's complete record -- personal information, employment history, payroll configuration, government IDs, disciplinary history, and uploaded documents. HR and Admin users manage document uploads, verification, and expiry tracking; employees can view their own 201 file in read-only mode.

The 201 File is a legal requirement for Philippine employers under the Labor Code and DOLE regulations. It serves as the single source of truth for all employee-related documentation.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| TwoOhOneFiles.tsx | client/src/pages/TwoOhOneFiles.tsx | Frontend | 201 File listing page with employee search and quick access to individual files |
| EmployeeDetail.tsx | client/src/pages/EmployeeDetail.tsx | Frontend | Full 201 file viewer with tabbed sections (shared with Employee Management module) |
| documents.ts | server/routes/documents.ts | Backend | Document upload/download/delete API routes for employee file attachments |

## Key Features

- **Complete Employee Record View**: Aggregated view of all employee data across multiple database tables in a single tabbed interface
- **Document Upload/Download**: Upload employee documents (contracts, certifications, government IDs, clearances) with file type validation
- **Document Type Categorization**: Classify documents by type -- Pre-Employment, Contract, Government ID, Certification, Medical, Clearance, Others
- **Verification Status**: HR/Admin can mark documents as verified with timestamp and verifier tracking
- **Expiry Date Tracking**: Track document expiry dates (e.g., medical certificates, licenses) with visual warnings for near-expiry and expired documents
- **Government ID Management**: Dedicated section for Philippine government IDs (SSS, TIN, PhilHealth, Pag-IBIG) with image uploads for front/back copies
- **File Size and Type Validation**: Server-side validation for file size limits and allowed MIME types
- **Audit Trail**: Document upload/delete actions tracked with timestamps and user attribution

## Sections (Tabs)

| Tab | Data Source | Contents |
|-----|-----------|----------|
| Personal Information | `employees` | Name, address, birth date, gender, civil status, emergency contacts, blood type, religion, nationality |
| Employment Records | `employees` | Employee number, position, department, hire date, regularization date, status, role |
| Payroll Setup | `employees` | Rate type, daily/monthly rate, overtime multiplier, bank details, government contribution numbers |
| Disciplinary History | `disciplinary_records` | NTE records, explanations, sanctions, resolution status |
| Documents | `employee_documents` | Uploaded files with type, verification status, expiry date, download links |
| Government IDs | `employee_government_ids` | SSS, TIN, PhilHealth, Pag-IBIG with ID numbers and scanned copies |

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/employees/:id/complete-file | All authenticated | Fetch complete 201 file aggregating all sections |
| GET | /api/employees/:id/documents | All authenticated | List all documents for an employee |
| POST | /api/employees/:id/documents | ADMIN, HR | Upload a new document to an employee's 201 file |
| DELETE | /api/employees/:id/documents/:docId | ADMIN, HR | Remove a document from an employee's 201 file |
| PATCH | /api/employees/:id/documents/:docId/verify | ADMIN, HR | Mark a document as verified |
| GET | /api/employees/:id/government-ids | All authenticated | List government IDs for an employee |
| POST | /api/employees/:id/government-ids | ADMIN, HR | Add or update a government ID record |
| DELETE | /api/employees/:id/government-ids/:gidId | ADMIN, HR | Remove a government ID record |

## Dependencies

### Internal Module Dependencies
- **02-employee-management** -- Core employee data (this module reads from `employees` table)
- **09-disciplinary** -- Disciplinary records displayed in the 201 file's Disciplinary History tab
- **_shared/hooks/use-auth** -- Role detection for conditional rendering of upload/verify buttons
- **_shared/components/ui/*** -- Card, Table, Badge, Button, Tabs, Dialog, Input from Shadcn/UI

### External Libraries
- **TanStack Query** (v5.60.5) -- Server state management for fetching 201 file sections
- **React Hook Form** (v7.55.0) -- Document upload form management
- **Zod** (v3.24.2) -- File upload validation schemas
- **Multer** (Express middleware) -- Server-side file upload handling

## Database Tables

| Table | Operations | Key Fields |
|-------|-----------|------------|
| employees | Read | All personal, employment, payroll fields (see Module 02) |
| employee_documents | CRUD | id, employee_id, document_type, document_url, file_name, file_size, mime_type, verified, verified_by, verified_at, expiry_date, notes |
| employee_government_ids | CRUD | id, employee_id, id_type, id_number, issue_date, expiry_date, front_image_url, back_image_url, verified |
| disciplinary_records | Read | id, employee_id, violation, status, sanction (read for Disciplinary History tab) |

### Document Types Enum

| Value | Description |
|-------|-------------|
| Pre-Employment | Resume, application form, NBI clearance, transcript of records |
| Contract | Employment contract, amendments, renewals |
| Government_ID | SSS, TIN, PhilHealth, Pag-IBIG card copies |
| Certification | Training certificates, professional licenses |
| Medical | Medical certificate, annual physical exam results |
| Clearance | Company clearance, exit clearance |
| Others | Any document not fitting the above categories |

### Government ID Types

| Value | Description |
|-------|-------------|
| SSS | Social Security System |
| TIN | Tax Identification Number |
| PhilHealth | Philippine Health Insurance |
| PagIBIG | Home Development Mutual Fund |
| PRC | Professional Regulation Commission License |
| Passport | Philippine Passport |
| Drivers_License | LTO Driver's License |
| Voters_ID | COMELEC Voter's ID |
| Postal_ID | Philippine Postal ID |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Access Control | ADMIN/HR can view all employees' 201 files; WORKER/ENGINEER can view only their own |
| Document Upload | Only ADMIN/HR can upload, verify, or delete documents |
| File Size Limit | Maximum 10MB per file upload |
| Allowed MIME Types | PDF, JPEG, PNG, DOC/DOCX, XLS/XLSX |
| Verification | Once verified, document cannot be re-verified; verified_by and verified_at are immutable |
| Expiry Warning | Documents expiring within 30 days shown with amber warning; expired documents shown with red badge |
| Soft Delete Documents | Documents are not hard-deleted; they are marked as inactive in the database |
| Complete File Assembly | The /complete-file endpoint JOINs across employees, employee_documents, employee_government_ids, and disciplinary_records in a single response |

## Scholaris Adaptation Notes

- **Student 201 File**: Enrollment records, academic transcripts, medical/dental records, behavioral records, parent/guardian information, previous school records
- **Faculty 201 File**: Teaching credentials, PRC license, specializations, teaching load history, performance evaluations, training/seminar records
- **Add academic sections**: Replace "Payroll Setup" tab with "Academic Records" for students or "Teaching Load" for faculty
- **Add enrollment history**: Track student enrollment per school year and section assignments
- **Add grade records**: Per-subject grades per grading period linked to student 201 file
- **Medical records section**: Health assessment forms, vaccination records (required by DepEd)
- **Document types expand**: Add Transcript of Records, Form 137, Form 138, Good Moral Certificate, Birth Certificate (NSO/PSA)
