-- ============================================================================
-- Module 02: Employee Management
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: employees
-- Description: Core employee master data - central to all HRIS modules
-- Fields: 50+ covering personal info, employment, compensation, shift config
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

-- Indexes for common query patterns
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
COMMENT ON COLUMN employees.status IS 'Active, Probationary, Terminated, Suspended, Resigned, AWOL';
COMMENT ON COLUMN employees.role IS 'ADMIN, HR, ENGINEER, WORKER - maps to system user role';
COMMENT ON COLUMN employees.rate_type IS 'daily or monthly - determines payroll computation method';
COMMENT ON COLUMN employees.qr_token IS '32-character token for QR code attendance scanning';
COMMENT ON COLUMN employees.shift_work_days IS 'Comma-separated days: Mon,Tue,Wed,Thu,Fri';
COMMENT ON COLUMN employees.is_deleted IS 'Soft delete flag - records are never physically deleted';
