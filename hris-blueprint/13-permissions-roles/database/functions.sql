-- ============================================================================
-- Module 13: Permissions & Roles
-- File: functions.sql
-- Database Functions for Permission Checking
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: check_user_permission
-- Core permission check: evaluates role defaults + individual overrides + expiry
-- Returns true if the user has the specified permission
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_module VARCHAR,
    p_action VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role VARCHAR;
    v_is_superadmin BOOLEAN;
    v_individual_grant BOOLEAN;
    v_role_has_permission BOOLEAN;
BEGIN
    -- Get user role and superadmin status
    SELECT role, COALESCE(is_superadmin, false)
    INTO v_user_role, v_is_superadmin
    FROM users
    WHERE id = p_user_id;

    -- Superadmin bypasses all checks
    IF v_is_superadmin THEN
        RETURN true;
    END IF;

    -- Check for individual permission override (non-expired)
    SELECT granted INTO v_individual_grant
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
      AND p.module = p_module
      AND p.action = p_action
      AND (up.expires_at IS NULL OR up.expires_at > NOW());

    -- If individual override exists, use it
    IF v_individual_grant IS NOT NULL THEN
        RETURN v_individual_grant;
    END IF;

    -- Fall back to role-based defaults
    -- ADMIN has all permissions
    IF v_user_role = 'ADMIN' THEN
        RETURN true;
    END IF;

    -- HR has most permissions except audit, settings write, and permission management
    IF v_user_role = 'HR' THEN
        RETURN NOT (
            (p_module = 'audit' AND p_action = 'read')
            OR (p_module = 'settings' AND p_action = 'update')
        );
    END IF;

    -- ENGINEER has project, task, and read-only access to some modules
    IF v_user_role = 'ENGINEER' THEN
        RETURN (
            (p_module = 'projects' AND p_action IN ('read', 'update'))
            OR (p_module = 'tasks' AND p_action IN ('read', 'create', 'update'))
            OR (p_module = 'attendance' AND p_action = 'read')
            OR (p_module = 'employees' AND p_action = 'read')
            OR (p_module = 'expenses' AND p_action IN ('create', 'read'))
            OR (p_module = 'leave' AND p_action IN ('create', 'read'))
            OR (p_module = 'devotionals' AND p_action = 'read')
        );
    END IF;

    -- WORKER has self-service read + limited create
    IF v_user_role = 'WORKER' THEN
        RETURN (
            (p_module = 'attendance' AND p_action = 'read')
            OR (p_module = 'leave' AND p_action IN ('create', 'read'))
            OR (p_module = 'expenses' AND p_action IN ('create', 'read'))
            OR (p_module = 'tasks' AND p_action IN ('read', 'update'))
            OR (p_module = 'devotionals' AND p_action = 'read')
            OR (p_module = 'employees' AND p_action = 'read')
            OR (p_module = 'payroll' AND p_action = 'read')
        );
    END IF;

    -- Default: deny
    RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_user_permission IS 'Core permission check: superadmin bypass -> individual override -> role default';

-- ---------------------------------------------------------------------------
-- Function: get_user_effective_permissions
-- Returns all effective permissions for a user (resolved from role + overrides)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID)
RETURNS TABLE(
    module VARCHAR,
    action VARCHAR,
    granted BOOLEAN,
    source VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.module,
        p.action,
        check_user_permission(p_user_id, p.module, p.action) AS granted,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM user_permissions up
                WHERE up.user_id = p_user_id
                  AND up.permission_id = p.id
                  AND (up.expires_at IS NULL OR up.expires_at > NOW())
            ) THEN 'individual'::VARCHAR
            ELSE 'role'::VARCHAR
        END AS source
    FROM permissions p
    ORDER BY p.module, p.action;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_effective_permissions IS 'Returns all permissions for a user with resolution source (role or individual override)';

-- ---------------------------------------------------------------------------
-- Function: grant_user_permission
-- Grants or revokes a specific permission for a user with optional expiry
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION grant_user_permission(
    p_user_id UUID,
    p_module VARCHAR,
    p_action VARCHAR,
    p_granted BOOLEAN DEFAULT true,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_permission_id UUID;
    v_user_permission_id UUID;
BEGIN
    -- Find the permission ID
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE module = p_module AND action = p_action;

    IF v_permission_id IS NULL THEN
        RAISE EXCEPTION 'Permission not found: %.%', p_module, p_action;
    END IF;

    -- Upsert the user permission
    INSERT INTO user_permissions (user_id, permission_id, granted, expires_at)
    VALUES (p_user_id, v_permission_id, p_granted, p_expires_at)
    ON CONFLICT (user_id, permission_id)
    DO UPDATE SET
        granted = p_granted,
        expires_at = p_expires_at
    RETURNING id INTO v_user_permission_id;

    RETURN v_user_permission_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION grant_user_permission IS 'Grants or revokes a permission for a specific user with optional expiry';

-- ---------------------------------------------------------------------------
-- Function: cleanup_expired_permissions
-- Removes expired permission overrides (run periodically via cron/scheduler)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_permissions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_permissions
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_permissions IS 'Removes expired permission overrides; should be run periodically';
