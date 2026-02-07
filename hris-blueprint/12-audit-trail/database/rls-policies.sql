-- ============================================================================
-- Module 12: Audit Trail
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policy: Only ADMIN can view audit logs
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_admin_select ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

-- ---------------------------------------------------------------------------
-- Policy: All authenticated users can insert audit logs
-- (insertions happen server-side during write operations across all modules)
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_insert ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Policy: Audit logs are immutable -- no updates allowed
-- ---------------------------------------------------------------------------
-- No UPDATE policy defined. Any attempt to update will be denied by RLS.

-- ---------------------------------------------------------------------------
-- Policy: Audit logs are immutable -- no deletes allowed
-- ---------------------------------------------------------------------------
-- No DELETE policy defined. Any attempt to delete will be denied by RLS.
-- Even ADMIN cannot delete audit logs to preserve integrity.
-- If log retention is needed, implement a separate scheduled job running
-- as the database owner (bypassing RLS).

-- ---------------------------------------------------------------------------
-- Access Control Summary:
--   ADMIN   : SELECT (full read access to all audit logs)
--   HR      : No direct access (audit logs are admin-only)
--   ENGINEER: No access
--   WORKER  : No access
--   All     : INSERT (server-side only, triggered by application operations)
-- ---------------------------------------------------------------------------
