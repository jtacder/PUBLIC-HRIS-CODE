-- ============================================================================
-- Module 13: Permissions & Roles
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on permissions table
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_permissions table
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies: roles
-- ---------------------------------------------------------------------------

-- All authenticated users can read role definitions (needed for UI display)
CREATE POLICY roles_select_all ON roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Only ADMIN can manage roles
CREATE POLICY roles_admin_insert ON roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

CREATE POLICY roles_admin_update ON roles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

CREATE POLICY roles_admin_delete ON roles
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------------------------
-- Policies: permissions
-- ---------------------------------------------------------------------------

-- All authenticated users can read permission definitions
CREATE POLICY permissions_select_all ON permissions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only ADMIN can manage permission definitions
CREATE POLICY permissions_admin_insert ON permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

CREATE POLICY permissions_admin_update ON permissions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------------------------
-- Policies: user_permissions
-- ---------------------------------------------------------------------------

-- ADMIN can view all user permission overrides
CREATE POLICY user_permissions_admin_select ON user_permissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

-- Users can view their own permission overrides
CREATE POLICY user_permissions_self_select ON user_permissions
    FOR SELECT
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- Only ADMIN can grant/revoke individual permissions
CREATE POLICY user_permissions_admin_insert ON user_permissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

CREATE POLICY user_permissions_admin_update ON user_permissions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

CREATE POLICY user_permissions_admin_delete ON user_permissions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------------------------
-- Access Control Summary:
--   ADMIN   : Full CRUD on roles, permissions, and user_permissions
--   HR      : Read roles and permissions (for display), no management
--   ENGINEER: Read roles and permissions (for display), no management
--   WORKER  : Read roles and permissions (for display), no management
--   All     : Can read their own user_permissions
-- ---------------------------------------------------------------------------
