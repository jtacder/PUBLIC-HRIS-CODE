-- ============================================================================
-- HRIS (Human Resource Information System) - Complete Database Schema
-- ============================================================================
-- Database: PostgreSQL 15+
-- ORM: Drizzle ORM (reverse-engineered from ElectroManage ERP)
-- Generated: 2026-02-07
-- Total Tables: 40+
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- For uuid_generate_v4()

-- ============================================================================
-- SECTION 1: AUTHENTICATION & AUTHORIZATION TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: users
-- Description: Core user accounts for system authentication
-- Module: 13-permissions-roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'WORKER'
                    CHECK (role IN ('ADMIN', 'HR', 'ENGINEER', 'WORKER')),
    is_superadmin   BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_login_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

COMMENT ON TABLE users IS 'Core user accounts for system authentication and authorization';
COMMENT ON COLUMN users.role IS 'User role: ADMIN, HR, ENGINEER, or WORKER';
COMMENT ON COLUMN users.is_superadmin IS 'Whether user has unrestricted system access';

-- ---------------------------------------------------------------------------
-- Table: sessions
-- Description: Express session store for connect-pg-simple
-- Module: 13-permissions-roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    sid     VARCHAR NOT NULL PRIMARY KEY,
    sess    JSON NOT NULL,
    expire  TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions(expire);

COMMENT ON TABLE sessions IS 'Server-side session storage using connect-pg-simple';

-- ---------------------------------------------------------------------------
-- Table: roles
-- Description: Named roles for role-based access control
-- Module: 13-permissions-roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roles_name ON roles(name);

COMMENT ON TABLE roles IS 'Named roles for flexible RBAC beyond the four base user roles';
COMMENT ON COLUMN roles.is_system IS 'System roles cannot be deleted';

-- ---------------------------------------------------------------------------
-- Table: permissions
-- Description: Granular permission definitions per module and action
-- Module: 13-permissions-roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module      VARCHAR(100) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(module, action)
);

CREATE INDEX idx_permissions_module ON permissions(module);
CREATE INDEX idx_permissions_module_action ON permissions(module, action);

COMMENT ON TABLE permissions IS 'Granular permission definitions linking modules to allowed actions';

-- ---------------------------------------------------------------------------
-- Table: user_permissions
-- Description: Maps permissions to individual users with optional expiry
-- Module: 13-permissions-roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted         BOOLEAN NOT NULL DEFAULT true,
    expires_at      TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);

COMMENT ON TABLE user_permissions IS 'Grants or denies specific permissions to individual users';

-- ============================================================================
-- SECTION 2: EMPLOYEE MANAGEMENT TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: employees
-- Description: Core employee master data with 50+ fields
-- Module: 02-employee-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_no             VARCHAR(50) NOT NULL UNIQUE,
    first_name              VARCHAR(100) NOT NULL,
    last_name               VARCHAR(100) NOT NULL,
    middle_name             VARCHAR(100),
    suffix                  VARCHAR(20),
    email                   VARCHAR(255) UNIQUE,
    phone                   VARCHAR(20),
    address                 TEXT,
    city                    VARCHAR(100),
    province                VARCHAR(100),
    zip_code                VARCHAR(10),
    birth_date              DATE,
    gender                  VARCHAR(20),
    civil_status            VARCHAR(30),
    nationality             VARCHAR(50) DEFAULT 'Filipino',
    blood_type              VARCHAR(5),
    religion                VARCHAR(50),
    emergency_contact_name  VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),

    -- Employment details
    position                VARCHAR(100),
    department              VARCHAR(100),
    hire_date               DATE,
    regularization_date     DATE,
    separation_date         DATE,
    status                  VARCHAR(30) NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active', 'Probationary', 'Terminated', 'Suspended', 'Resigned', 'AWOL')),
    role                    VARCHAR(50) NOT NULL DEFAULT 'WORKER'
                            CHECK (role IN ('ADMIN', 'HR', 'ENGINEER', 'WORKER')),

    -- Government IDs
    sss_no                  VARCHAR(20),
    philhealth_no           VARCHAR(20),
    pagibig_no              VARCHAR(20),
    tin_no                  VARCHAR(20),

    -- Compensation
    daily_rate              DECIMAL(10,2) DEFAULT 0,
    monthly_rate            DECIMAL(10,2) DEFAULT 0,
    rate_type               VARCHAR(10) DEFAULT 'daily'
                            CHECK (rate_type IN ('daily', 'monthly')),
    overtime_rate_multiplier DECIMAL(4,2) DEFAULT 1.25,

    -- Banking
    bank_name               VARCHAR(100),
    bank_account_no         VARCHAR(50),

    -- Shift configuration
    shift_start_time        VARCHAR(10),
    shift_end_time          VARCHAR(10),
    shift_work_days         VARCHAR(50),

    -- QR / Biometrics
    qr_token                VARCHAR(32) UNIQUE,
    face_descriptor         TEXT,

    -- Media
    photo_url               TEXT,

    -- Linked user account
    user_id                 UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Soft delete
    is_deleted              BOOLEAN NOT NULL DEFAULT false,
    deleted_at              TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_employee_no ON employees(employee_no);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_role ON employees(role);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_is_deleted ON employees(is_deleted);
CREATE INDEX idx_employees_qr_token ON employees(qr_token);
CREATE INDEX idx_employees_name ON employees(last_name, first_name);

COMMENT ON TABLE employees IS 'Core employee master data - central to all HRIS modules';
COMMENT ON COLUMN employees.employee_no IS 'Company-assigned employee number (e.g., EMP-2024-001)';
COMMENT ON COLUMN employees.qr_token IS '32-character token for QR code attendance scanning';
COMMENT ON COLUMN employees.is_deleted IS 'Soft delete flag - records are never physically deleted';

-- ---------------------------------------------------------------------------
-- Table: employee_documents
-- Description: Document uploads linked to employees (201 file)
-- Module: 05-201-files
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type   VARCHAR(100) NOT NULL,
    document_url    TEXT NOT NULL,
    file_name       VARCHAR(255),
    file_size       INTEGER,
    mime_type       VARCHAR(100),
    verified        BOOLEAN NOT NULL DEFAULT false,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMP WITH TIME ZONE,
    expiry_date     DATE,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_document_type ON employee_documents(document_type);
CREATE INDEX idx_employee_documents_expiry_date ON employee_documents(expiry_date);

COMMENT ON TABLE employee_documents IS 'Uploaded documents associated with employee 201 files';
COMMENT ON COLUMN employee_documents.document_type IS 'E.g., resume, contract, NBI_clearance, diploma, etc.';

-- ---------------------------------------------------------------------------
-- Table: employee_government_ids
-- Description: Government-issued identification numbers for employees
-- Module: 05-201-files
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_government_ids (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    id_type     VARCHAR(50) NOT NULL,
    id_number   VARCHAR(50) NOT NULL,
    issue_date  DATE,
    expiry_date DATE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employee_gov_ids_employee_id ON employee_government_ids(employee_id);
CREATE INDEX idx_employee_gov_ids_id_type ON employee_government_ids(id_type);

COMMENT ON TABLE employee_government_ids IS 'Government-issued IDs (SSS, PhilHealth, Pag-IBIG, TIN, etc.)';

-- ============================================================================
-- SECTION 3: PROJECT MANAGEMENT TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: projects
-- Description: Construction projects and office locations
-- Module: 16-project-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    description     TEXT,
    is_office       BOOLEAN NOT NULL DEFAULT false,
    location_lat    DECIMAL(10,7),
    location_lng    DECIMAL(10,7),
    geo_radius      INTEGER DEFAULT 100,
    address         TEXT,
    start_date      DATE,
    deadline        DATE,
    actual_end_date DATE,
    budget          DECIMAL(15,2),
    actual_cost     DECIMAL(15,2) DEFAULT 0,
    status          VARCHAR(30) NOT NULL DEFAULT 'Planning'
                    CHECK (status IN ('Planning', 'Active', 'On_Hold', 'Completed', 'Cancelled')),
    manager_id      UUID REFERENCES employees(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_is_office ON projects(is_office);
CREATE INDEX idx_projects_manager_id ON projects(manager_id);

COMMENT ON TABLE projects IS 'Construction project sites and office locations with geofence data';
COMMENT ON COLUMN projects.geo_radius IS 'Geofence radius in meters for attendance verification';
COMMENT ON COLUMN projects.is_office IS 'Whether this is a permanent office location vs. a project site';

-- ---------------------------------------------------------------------------
-- Table: project_assignments
-- Description: Maps employees to projects they are assigned to
-- Module: 16-project-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_in_project VARCHAR(100),
    assigned_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, employee_id, assigned_date)
);

CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_employee_id ON project_assignments(employee_id);
CREATE INDEX idx_project_assignments_is_active ON project_assignments(is_active);

COMMENT ON TABLE project_assignments IS 'Employee-to-project assignment mapping with date ranges';

-- ============================================================================
-- SECTION 4: TASK MANAGEMENT TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: tasks
-- Description: Kanban-style task tracking within projects
-- Module: 17-task-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    project_id              UUID REFERENCES projects(id) ON DELETE SET NULL,
    assigned_to_id          UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_by_id           UUID REFERENCES users(id),
    status                  VARCHAR(30) NOT NULL DEFAULT 'Todo'
                            CHECK (status IN ('Todo', 'In_Progress', 'Blocked', 'Done')),
    priority                VARCHAR(20) NOT NULL DEFAULT 'Medium'
                            CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    due_date                DATE,
    completed_at            TIMESTAMP WITH TIME ZONE,
    sort_order              INTEGER DEFAULT 0,
    completion_photo_url    TEXT,
    estimated_hours         DECIMAL(5,2),
    actual_hours            DECIMAL(5,2),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to_id ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_sort_order ON tasks(sort_order);

COMMENT ON TABLE tasks IS 'Kanban-style task tracking with status workflow (Todo -> Done)';

-- ---------------------------------------------------------------------------
-- Table: task_comments
-- Description: Comments and attachments on tasks
-- Module: 17-task-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    attachment_url  TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);

COMMENT ON TABLE task_comments IS 'Discussion thread and file attachments on individual tasks';

-- ============================================================================
-- SECTION 5: ATTENDANCE & TIME TRACKING TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: attendance_logs
-- Description: Daily time-in/time-out records with GPS and photo verification
-- Module: 04-attendance-system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id              UUID REFERENCES projects(id) ON DELETE SET NULL,
    time_in                 TIMESTAMP WITH TIME ZONE,
    time_out                TIMESTAMP WITH TIME ZONE,

    -- GPS verification
    gps_latitude            DECIMAL(10,7),
    gps_longitude           DECIMAL(10,7),
    gps_accuracy            DECIMAL(10,2),
    gps_latitude_out        DECIMAL(10,7),
    gps_longitude_out       DECIMAL(10,7),

    -- Photo verification
    photo_snapshot_url      TEXT,
    photo_snapshot_url_out  TEXT,

    -- Verification
    verification_status     VARCHAR(30) DEFAULT 'Pending'
                            CHECK (verification_status IN ('Verified', 'Off-site', 'Pending', 'Flagged')),
    face_verified           BOOLEAN NOT NULL DEFAULT false,

    -- Lateness
    late_minutes            INTEGER NOT NULL DEFAULT 0,
    late_deductible         BOOLEAN NOT NULL DEFAULT false,

    -- Overtime
    overtime_minutes        INTEGER NOT NULL DEFAULT 0,
    ot_status               VARCHAR(20) DEFAULT 'Pending'
                            CHECK (ot_status IN ('Pending', 'Approved', 'Rejected')),
    is_overtime_session     BOOLEAN NOT NULL DEFAULT false,

    -- Shift info
    scheduled_shift_date    DATE,
    actual_shift_type       VARCHAR(10) DEFAULT 'day'
                            CHECK (actual_shift_type IN ('day', 'night')),

    -- Working time computation
    lunch_deduction_minutes INTEGER NOT NULL DEFAULT 0,
    total_working_minutes   INTEGER NOT NULL DEFAULT 0,

    -- Notes
    justification           TEXT,
    admin_notes             TEXT,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_project_id ON attendance_logs(project_id);
CREATE INDEX idx_attendance_logs_time_in ON attendance_logs(time_in);
CREATE INDEX idx_attendance_logs_scheduled_shift_date ON attendance_logs(scheduled_shift_date);
CREATE INDEX idx_attendance_logs_verification_status ON attendance_logs(verification_status);
CREATE INDEX idx_attendance_logs_employee_date ON attendance_logs(employee_id, scheduled_shift_date);
CREATE INDEX idx_attendance_logs_ot_status ON attendance_logs(ot_status);

COMMENT ON TABLE attendance_logs IS 'Time-in/time-out records with GPS geofence and photo snapshot verification';
COMMENT ON COLUMN attendance_logs.late_deductible IS 'Whether lateness should trigger a payroll deduction';
COMMENT ON COLUMN attendance_logs.total_working_minutes IS 'Computed total working minutes after lunch deduction';

-- ---------------------------------------------------------------------------
-- Table: attendance_verifications
-- Description: Admin/HR verification of attendance records
-- Module: 04-attendance-system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_verifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_log_id   UUID NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL,
    verified_by         UUID NOT NULL REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_verifications_log_id ON attendance_verifications(attendance_log_id);
CREATE INDEX idx_attendance_verifications_verified_by ON attendance_verifications(verified_by);

COMMENT ON TABLE attendance_verifications IS 'Admin/HR verification audit trail for attendance log entries';

-- ============================================================================
-- SECTION 6: PAYROLL TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: payroll_periods
-- Description: Pay period definitions (semi-monthly or monthly)
-- Module: 08-payroll-system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_periods (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    pay_date    DATE,
    type        VARCHAR(20) NOT NULL DEFAULT 'semi_monthly'
                CHECK (type IN ('semi_monthly', 'monthly')),
    status      VARCHAR(20) NOT NULL DEFAULT 'Open'
                CHECK (status IN ('Open', 'Processing', 'Closed')),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(start_date, end_date)
);

CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX idx_payroll_periods_dates ON payroll_periods(start_date, end_date);

COMMENT ON TABLE payroll_periods IS 'Semi-monthly or monthly payroll period definitions';

-- ---------------------------------------------------------------------------
-- Table: payroll_records
-- Description: Individual employee payroll computation per period
-- Module: 08-payroll-system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_period_id       UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,

    -- Earnings
    basic_pay               DECIMAL(10,2) NOT NULL DEFAULT 0,
    overtime_pay            DECIMAL(10,2) NOT NULL DEFAULT 0,
    holiday_pay             DECIMAL(10,2) NOT NULL DEFAULT 0,
    allowances              DECIMAL(10,2) NOT NULL DEFAULT 0,
    gross_pay               DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Government deductions
    sss_deduction           DECIMAL(10,2) NOT NULL DEFAULT 0,
    philhealth_deduction    DECIMAL(10,2) NOT NULL DEFAULT 0,
    pagibig_deduction       DECIMAL(10,2) NOT NULL DEFAULT 0,
    withholding_tax         DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Other deductions
    cash_advance_deduction  DECIMAL(10,2) NOT NULL DEFAULT 0,
    late_deduction          DECIMAL(10,2) NOT NULL DEFAULT 0,
    unpaid_leave_deduction  DECIMAL(10,2) NOT NULL DEFAULT 0,
    other_deductions        DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Totals
    total_deductions        DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_pay                 DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Work metrics
    days_worked             DECIMAL(5,2) NOT NULL DEFAULT 0,
    hours_overtime          DECIMAL(5,2) NOT NULL DEFAULT 0,
    days_absent             DECIMAL(5,2) NOT NULL DEFAULT 0,
    days_late               DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Workflow
    status                  VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT', 'APPROVED', 'RELEASED')),
    approved_by             UUID REFERENCES users(id),
    approved_at             TIMESTAMP WITH TIME ZONE,
    released_at             TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, payroll_period_id)
);

CREATE INDEX idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX idx_payroll_records_period_id ON payroll_records(payroll_period_id);
CREATE INDEX idx_payroll_records_status ON payroll_records(status);

COMMENT ON TABLE payroll_records IS 'Per-employee payroll computation for each pay period';
COMMENT ON COLUMN payroll_records.status IS 'DRAFT -> APPROVED -> RELEASED workflow';

-- ---------------------------------------------------------------------------
-- Table: payslips
-- Description: Generated payslip records for employees
-- Module: 08-payroll-system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payslips (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_record_id   UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_period_id   UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    pdf_url             TEXT,
    generated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    emailed_at          TIMESTAMP WITH TIME ZONE,
    viewed_at           TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payslips_payroll_record_id ON payslips(payroll_record_id);
CREATE INDEX idx_payslips_employee_id ON payslips(employee_id);
CREATE INDEX idx_payslips_period_id ON payslips(payroll_period_id);

COMMENT ON TABLE payslips IS 'Generated payslip documents with delivery tracking';

-- ============================================================================
-- SECTION 7: LEAVE MANAGEMENT TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: leave_types
-- Description: Leave type definitions with accrual rules
-- Module: 06-leave-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    days_per_year   INTEGER NOT NULL DEFAULT 0,
    is_paid         BOOLEAN NOT NULL DEFAULT true,
    accrual_mode    VARCHAR(20) NOT NULL DEFAULT 'annual'
                    CHECK (accrual_mode IN ('annual', 'monthly', 'none')),
    requires_proof  BOOLEAN NOT NULL DEFAULT false,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_types_name ON leave_types(name);
CREATE INDEX idx_leave_types_is_active ON leave_types(is_active);

COMMENT ON TABLE leave_types IS 'Leave type configuration (Sick, Vacation, Maternity, etc.)';

-- ---------------------------------------------------------------------------
-- Table: leave_requests
-- Description: Employee leave request submissions and approvals
-- Module: 06-leave-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id       UUID NOT NULL REFERENCES leave_types(id),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    days_count          DECIMAL(5,2) NOT NULL,
    reason              TEXT,
    supporting_doc_url  TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMP WITH TIME ZONE,
    rejection_reason    TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_leave_type_id ON leave_requests(leave_type_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

COMMENT ON TABLE leave_requests IS 'Employee leave request submissions with approval workflow';

-- ---------------------------------------------------------------------------
-- Table: leave_allocations
-- Description: Annual/monthly leave balance allocations per employee
-- Module: 06-leave-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
    year            INTEGER NOT NULL,
    total_days      DECIMAL(5,2) NOT NULL DEFAULT 0,
    used_days       DECIMAL(5,2) NOT NULL DEFAULT 0,
    remaining_days  DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_allocations_employee_id ON leave_allocations(employee_id);
CREATE INDEX idx_leave_allocations_leave_type_id ON leave_allocations(leave_type_id);
CREATE INDEX idx_leave_allocations_year ON leave_allocations(year);

COMMENT ON TABLE leave_allocations IS 'Per-employee per-year leave balance tracking';

-- ---------------------------------------------------------------------------
-- Table: holidays
-- Description: Company-wide holiday calendar
-- Module: 06-leave-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    date        DATE NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'regular'
                CHECK (type IN ('regular', 'special')),
    year        INTEGER NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_year ON holidays(year);
CREATE INDEX idx_holidays_type ON holidays(type);

COMMENT ON TABLE holidays IS 'Company holiday calendar affecting payroll and attendance';
COMMENT ON COLUMN holidays.type IS 'Regular holidays (200% pay) vs special holidays (130% pay)';

-- ============================================================================
-- SECTION 8: CASH ADVANCE / LOANS TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: cash_advances
-- Description: Employee cash advance requests and tracking
-- Module: 07-loans-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_advances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount                  DECIMAL(10,2) NOT NULL,
    purpose                 TEXT,
    deduction_per_cutoff    DECIMAL(10,2) NOT NULL DEFAULT 0,
    remaining_balance       DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_installments      INTEGER,
    status                  VARCHAR(20) NOT NULL DEFAULT 'Pending'
                            CHECK (status IN ('Pending', 'Approved', 'Disbursed', 'Rejected', 'Fully_Paid')),
    approved_by             UUID REFERENCES users(id),
    approved_at             TIMESTAMP WITH TIME ZONE,
    disbursed_at            TIMESTAMP WITH TIME ZONE,
    rejection_reason        TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_advances_employee_id ON cash_advances(employee_id);
CREATE INDEX idx_cash_advances_status ON cash_advances(status);

COMMENT ON TABLE cash_advances IS 'Employee cash advance (salary loan) requests with installment tracking';

-- ---------------------------------------------------------------------------
-- Table: cash_advance_deductions
-- Description: Per-payroll deduction records for cash advances
-- Module: 07-loans-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_advance_deductions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_advance_id     UUID NOT NULL REFERENCES cash_advances(id) ON DELETE CASCADE,
    payroll_record_id   UUID REFERENCES payroll_records(id) ON DELETE SET NULL,
    amount              DECIMAL(10,2) NOT NULL,
    deduction_date      DATE NOT NULL,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_advance_deductions_advance_id ON cash_advance_deductions(cash_advance_id);
CREATE INDEX idx_cash_advance_deductions_payroll_id ON cash_advance_deductions(payroll_record_id);

COMMENT ON TABLE cash_advance_deductions IS 'Individual deduction installments against cash advances';

-- ============================================================================
-- SECTION 9: DISCIPLINARY TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: disciplinary_records
-- Description: Employee disciplinary actions (NTE, show-cause)
-- Module: 09-disciplinary
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinary_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    violation       TEXT NOT NULL,
    description     TEXT,
    date_issued     DATE NOT NULL DEFAULT CURRENT_DATE,
    deadline        DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'Issued'
                    CHECK (status IN ('Issued', 'Explanation_Received', 'Under_Review', 'Resolved')),
    issued_by       UUID REFERENCES users(id),
    resolution      TEXT,
    resolved_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disciplinary_records_employee_id ON disciplinary_records(employee_id);
CREATE INDEX idx_disciplinary_records_status ON disciplinary_records(status);
CREATE INDEX idx_disciplinary_records_date_issued ON disciplinary_records(date_issued);

COMMENT ON TABLE disciplinary_records IS 'Employee disciplinary actions: NTE issuance and resolution tracking';

-- ---------------------------------------------------------------------------
-- Table: disciplinary_explanations
-- Description: Employee-submitted explanations for disciplinary actions
-- Module: 09-disciplinary
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinary_explanations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplinary_id     UUID NOT NULL REFERENCES disciplinary_records(id) ON DELETE CASCADE,
    content             TEXT NOT NULL,
    attachment_url      TEXT,
    submitted_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disciplinary_explanations_record_id ON disciplinary_explanations(disciplinary_id);

COMMENT ON TABLE disciplinary_explanations IS 'Employee-submitted written explanations in response to NTEs';

-- ---------------------------------------------------------------------------
-- Table: disciplinary_sanctions
-- Description: Sanctions applied after disciplinary process
-- Module: 09-disciplinary
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinary_sanctions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplinary_id     UUID NOT NULL REFERENCES disciplinary_records(id) ON DELETE CASCADE,
    type                VARCHAR(30) NOT NULL
                        CHECK (type IN ('verbal_warning', 'written_warning', 'suspension', 'termination')),
    start_date          DATE,
    end_date            DATE,
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disciplinary_sanctions_record_id ON disciplinary_sanctions(disciplinary_id);
CREATE INDEX idx_disciplinary_sanctions_type ON disciplinary_sanctions(type);

COMMENT ON TABLE disciplinary_sanctions IS 'Sanctions applied after disciplinary review (warning, suspension, termination)';

-- ============================================================================
-- SECTION 10: EXPENSE MANAGEMENT TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: expenses
-- Description: Expense claims linked to projects
-- Module: 18-expense-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
    amount          DECIMAL(10,2) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    description     TEXT,
    receipt_url     TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Reimbursed')),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    reimbursed_at   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_requester_id ON expenses(requester_id);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_category ON expenses(category);

COMMENT ON TABLE expenses IS 'Employee expense claims with receipt uploads and approval workflow';

-- ---------------------------------------------------------------------------
-- Table: expense_approvals
-- Description: Approval audit trail for expenses
-- Module: 18-expense-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id      UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    approved_by     UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_approvals_expense_id ON expense_approvals(expense_id);
CREATE INDEX idx_expense_approvals_approved_by ON expense_approvals(approved_by);

COMMENT ON TABLE expense_approvals IS 'Approval action audit trail for expense claims';

-- ============================================================================
-- SECTION 11: DEVOTIONAL TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: devotionals
-- Description: Daily devotional content shared with employees
-- Module: 11-devotional
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devotionals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   VARCHAR(255) NOT NULL,
    content                 TEXT NOT NULL,
    scripture_reference     VARCHAR(255),
    date                    DATE NOT NULL,
    author                  VARCHAR(100),
    is_published            BOOLEAN NOT NULL DEFAULT true,
    created_by              UUID REFERENCES users(id),
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devotionals_date ON devotionals(date);
CREATE INDEX idx_devotionals_created_by ON devotionals(created_by);
CREATE INDEX idx_devotionals_is_published ON devotionals(is_published);

COMMENT ON TABLE devotionals IS 'Daily devotional content for company spiritual engagement';

-- ---------------------------------------------------------------------------
-- Table: devotional_reading_logs
-- Description: Tracks which employees have read each devotional
-- Module: 11-devotional
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devotional_reading_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devotional_id   UUID NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    read_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(devotional_id, employee_id)
);

CREATE INDEX idx_devotional_reading_logs_devotional_id ON devotional_reading_logs(devotional_id);
CREATE INDEX idx_devotional_reading_logs_employee_id ON devotional_reading_logs(employee_id);

COMMENT ON TABLE devotional_reading_logs IS 'Read receipts tracking employee engagement with devotionals';

-- ============================================================================
-- SECTION 12: NOTIFICATION TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: notifications
-- Description: In-app notification records for users
-- Module: 14-notification-system
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    type        VARCHAR(50) NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'warning', 'success', 'error', 'approval')),
    entity_type VARCHAR(100),
    entity_id   UUID,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    read_at     TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

COMMENT ON TABLE notifications IS 'In-app notification delivery and read tracking';

-- ============================================================================
-- SECTION 13: SYSTEM / AUDIT TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: audit_logs
-- Description: Comprehensive audit trail of all system actions
-- Module: 12-audit-trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL
                    CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'RELEASE', 'LOGIN', 'LOGOUT')),
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    description     TEXT,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

COMMENT ON TABLE audit_logs IS 'Immutable audit trail recording all CRUD and approval actions';
COMMENT ON COLUMN audit_logs.old_values IS 'JSONB snapshot of entity state before the action';
COMMENT ON COLUMN audit_logs.new_values IS 'JSONB snapshot of entity state after the action';

-- ---------------------------------------------------------------------------
-- Table: company_settings
-- Description: Key-value configuration store for system settings
-- Module: 10-hr-settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       TEXT,
    data_type   VARCHAR(20) DEFAULT 'string'
                CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    category    VARCHAR(50),
    description TEXT,
    updated_by  UUID REFERENCES users(id),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_settings_key ON company_settings(key);
CREATE INDEX idx_company_settings_category ON company_settings(category);

COMMENT ON TABLE company_settings IS 'System-wide key-value configuration store';

-- ---------------------------------------------------------------------------
-- Table: schedule_templates
-- Description: Predefined shift schedule templates
-- Module: 03-schedule-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    shift_start     VARCHAR(10) NOT NULL,
    shift_end       VARCHAR(10) NOT NULL,
    work_days       VARCHAR(50) NOT NULL,
    break_minutes   INTEGER NOT NULL DEFAULT 60,
    is_night_shift  BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_templates_is_active ON schedule_templates(is_active);

COMMENT ON TABLE schedule_templates IS 'Predefined shift schedule templates assignable to employees';

-- ---------------------------------------------------------------------------
-- Table: employee_schedules
-- Description: Per-employee shift schedule assignments
-- Module: 03-schedule-management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id         UUID REFERENCES schedule_templates(id) ON DELETE SET NULL,
    effective_date      DATE NOT NULL,
    end_date            DATE,
    shift_start         VARCHAR(10) NOT NULL,
    shift_end           VARCHAR(10) NOT NULL,
    work_days           VARCHAR(50) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employee_schedules_employee_id ON employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_effective_date ON employee_schedules(effective_date);
CREATE INDEX idx_employee_schedules_is_active ON employee_schedules(is_active);

COMMENT ON TABLE employee_schedules IS 'Per-employee shift schedule assignments with effective dates';

-- ============================================================================
-- SECTION 14: TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp on any row modification
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have an updated_at column
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
            t
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- SECTION 15: SEED DATA - DEFAULT ROLES AND PERMISSIONS
-- ============================================================================

-- Default roles
INSERT INTO roles (name, description, is_system) VALUES
    ('ADMIN', 'System administrator with full access', true),
    ('HR', 'Human resources staff with employee management access', true),
    ('ENGINEER', 'Project engineer with project and task management access', true),
    ('WORKER', 'Regular employee with self-service portal access', true)
ON CONFLICT (name) DO NOTHING;

-- Default permissions for all modules
INSERT INTO permissions (module, action, description) VALUES
    -- Employee Management
    ('employees', 'create', 'Create new employee records'),
    ('employees', 'read', 'View employee information'),
    ('employees', 'update', 'Update employee records'),
    ('employees', 'delete', 'Soft-delete employee records'),
    ('employees', 'export', 'Export employee data'),
    -- Attendance
    ('attendance', 'create', 'Record attendance (time-in/out)'),
    ('attendance', 'read', 'View attendance records'),
    ('attendance', 'update', 'Modify attendance records'),
    ('attendance', 'verify', 'Verify attendance entries'),
    ('attendance', 'approve_ot', 'Approve overtime requests'),
    -- Payroll
    ('payroll', 'create', 'Generate payroll records'),
    ('payroll', 'read', 'View payroll data'),
    ('payroll', 'approve', 'Approve payroll for release'),
    ('payroll', 'release', 'Release payroll to employees'),
    -- Leave
    ('leave', 'create', 'Submit leave requests'),
    ('leave', 'read', 'View leave records'),
    ('leave', 'approve', 'Approve/reject leave requests'),
    ('leave', 'manage_types', 'Manage leave type definitions'),
    -- Cash Advance
    ('cash_advance', 'create', 'Request cash advances'),
    ('cash_advance', 'read', 'View cash advance records'),
    ('cash_advance', 'approve', 'Approve/reject cash advances'),
    -- Projects
    ('projects', 'create', 'Create new projects'),
    ('projects', 'read', 'View project information'),
    ('projects', 'update', 'Update project details'),
    ('projects', 'delete', 'Delete projects'),
    ('projects', 'assign', 'Assign employees to projects'),
    -- Tasks
    ('tasks', 'create', 'Create new tasks'),
    ('tasks', 'read', 'View tasks'),
    ('tasks', 'update', 'Update task status and details'),
    ('tasks', 'delete', 'Delete tasks'),
    -- Disciplinary
    ('disciplinary', 'create', 'Issue disciplinary actions'),
    ('disciplinary', 'read', 'View disciplinary records'),
    ('disciplinary', 'update', 'Update disciplinary status'),
    ('disciplinary', 'submit_explanation', 'Submit employee explanation'),
    -- Expenses
    ('expenses', 'create', 'Submit expense claims'),
    ('expenses', 'read', 'View expense records'),
    ('expenses', 'approve', 'Approve/reject expense claims'),
    -- Devotionals
    ('devotionals', 'create', 'Create devotional content'),
    ('devotionals', 'read', 'View devotionals'),
    ('devotionals', 'update', 'Update devotional content'),
    -- Settings
    ('settings', 'read', 'View system settings'),
    ('settings', 'update', 'Modify system settings'),
    -- Audit
    ('audit', 'read', 'View audit trail logs'),
    -- Permissions
    ('permissions', 'manage', 'Manage user roles and permissions')
ON CONFLICT (module, action) DO NOTHING;

-- Default leave types (Philippine labor law)
INSERT INTO leave_types (name, days_per_year, is_paid, accrual_mode, description) VALUES
    ('Vacation Leave', 5, true, 'annual', 'Service Incentive Leave per Philippine Labor Code'),
    ('Sick Leave', 5, true, 'annual', 'Sick leave allocation'),
    ('Maternity Leave', 105, true, 'none', 'RA 11210 - Expanded Maternity Leave'),
    ('Paternity Leave', 7, true, 'none', 'RA 8187 - Paternity Leave Act'),
    ('Solo Parent Leave', 7, true, 'annual', 'RA 8972 - Solo Parents Welfare Act'),
    ('Emergency Leave', 3, true, 'annual', 'Emergency personal leave'),
    ('Bereavement Leave', 3, true, 'none', 'Leave for immediate family death'),
    ('Unpaid Leave', 0, false, 'none', 'Leave without pay')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
