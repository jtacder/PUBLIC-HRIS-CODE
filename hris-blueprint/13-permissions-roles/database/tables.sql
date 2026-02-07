-- ============================================================================
-- Module 13: Permissions & Roles
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: roles
-- Description: Role definitions for the RBAC system
-- Seeded with ADMIN, HR, ENGINEER, WORKER on first startup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(50) NOT NULL UNIQUE,
    description         TEXT,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Role definitions for role-based access control';
COMMENT ON COLUMN roles.name IS 'Unique role name: ADMIN, HR, ENGINEER, WORKER';

-- Seed default roles
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Full system access. Can manage all modules, users, and settings.'),
    ('HR', 'Human resources access. Can manage employees, payroll, leave, and disciplinary.'),
    ('ENGINEER', 'Project-scoped access. Can view assigned projects, tasks, and team members.'),
    ('WORKER', 'Self-service access only. Can view own attendance, payslips, leave, and tasks.')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Table: permissions
-- Description: Granular permission definitions (module + action pairs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module              VARCHAR(100) NOT NULL,
    action              VARCHAR(100) NOT NULL,
    description         TEXT,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Unique constraint on module + action pair
    CONSTRAINT uq_permission_module_action UNIQUE (module, action)
);

-- Indexes for common query patterns
CREATE INDEX idx_permissions_module ON permissions(module);

COMMENT ON TABLE permissions IS 'Granular permission definitions organized by module and action';
COMMENT ON COLUMN permissions.module IS 'Module name (e.g., employees, payroll, leave, projects)';
COMMENT ON COLUMN permissions.action IS 'Action name (e.g., create, read, update, delete, approve)';

-- Seed default permissions for core modules
INSERT INTO permissions (module, action, description) VALUES
    -- Employee Management
    ('employees', 'create', 'Create new employee records'),
    ('employees', 'read', 'View employee records'),
    ('employees', 'update', 'Update employee records'),
    ('employees', 'delete', 'Delete (soft-delete) employee records'),
    -- Payroll
    ('payroll', 'create', 'Create payroll runs'),
    ('payroll', 'read', 'View payroll records'),
    ('payroll', 'update', 'Update payroll records'),
    ('payroll', 'approve', 'Approve payroll for release'),
    ('payroll', 'release', 'Release payroll to employees'),
    -- Leave
    ('leave', 'create', 'Submit leave requests'),
    ('leave', 'read', 'View leave requests'),
    ('leave', 'approve', 'Approve or reject leave requests'),
    -- Attendance
    ('attendance', 'create', 'Create attendance records'),
    ('attendance', 'read', 'View attendance records'),
    ('attendance', 'update', 'Update attendance records'),
    -- Projects
    ('projects', 'create', 'Create projects'),
    ('projects', 'read', 'View projects'),
    ('projects', 'update', 'Update projects'),
    ('projects', 'delete', 'Delete projects'),
    -- Tasks
    ('tasks', 'create', 'Create tasks'),
    ('tasks', 'read', 'View tasks'),
    ('tasks', 'update', 'Update tasks'),
    ('tasks', 'delete', 'Delete tasks'),
    -- Expenses
    ('expenses', 'create', 'Submit expenses'),
    ('expenses', 'read', 'View expenses'),
    ('expenses', 'approve', 'Approve or reject expenses'),
    -- Audit
    ('audit', 'read', 'View audit trail'),
    -- Settings
    ('settings', 'read', 'View HR settings'),
    ('settings', 'update', 'Modify HR settings'),
    -- Devotionals
    ('devotionals', 'create', 'Create devotional entries'),
    ('devotionals', 'read', 'View devotionals'),
    ('devotionals', 'update', 'Update devotional entries'),
    ('devotionals', 'delete', 'Delete devotional entries')
ON CONFLICT (module, action) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Table: user_permissions
-- Description: Per-user permission overrides (grant or revoke specific permissions)
-- Supports temporary permissions via expires_at
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_permissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id       UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted             BOOLEAN NOT NULL DEFAULT true,
    expires_at          TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Prevent duplicate permission assignments
    CONSTRAINT uq_user_permission UNIQUE (user_id, permission_id)
);

-- Indexes for common query patterns
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX idx_user_permissions_expires_at ON user_permissions(expires_at)
    WHERE expires_at IS NOT NULL;

COMMENT ON TABLE user_permissions IS 'Per-user permission overrides that supplement or restrict role-based defaults';
COMMENT ON COLUMN user_permissions.granted IS 'true = explicitly grant permission, false = explicitly revoke';
COMMENT ON COLUMN user_permissions.expires_at IS 'Optional expiry timestamp; NULL means permanent grant';
