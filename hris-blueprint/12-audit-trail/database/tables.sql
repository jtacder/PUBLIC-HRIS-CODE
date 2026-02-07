-- ============================================================================
-- Module 12: Audit Trail
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: audit_logs
-- Description: Immutable log of all tracked operations across the HRIS
-- Records user actions with full before/after state for change tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who performed the action
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,

    -- What action was performed
    action              VARCHAR(50) NOT NULL
                        CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'RELEASE')),

    -- What entity was affected
    entity_type         VARCHAR(100) NOT NULL,
    entity_id           UUID,

    -- Change tracking (JSONB for flexible schema)
    old_values          JSONB,
    new_values          JSONB,

    -- Request metadata
    ip_address          VARCHAR(45),
    user_agent          TEXT,

    -- Timestamps (no updated_at -- audit logs are immutable)
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity_lookup ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);

-- GIN index for JSONB searches on old/new values
CREATE INDEX idx_audit_logs_old_values ON audit_logs USING GIN (old_values);
CREATE INDEX idx_audit_logs_new_values ON audit_logs USING GIN (new_values);

COMMENT ON TABLE audit_logs IS 'Immutable log of all tracked HRIS operations for compliance and accountability';
COMMENT ON COLUMN audit_logs.user_id IS 'FK to users -- the user who performed the action (NULL if user deleted)';
COMMENT ON COLUMN audit_logs.action IS 'Operation type: CREATE, READ, UPDATE, DELETE, APPROVE, RELEASE';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., Employee, Payroll, Leave, CashAdvance)';
COMMENT ON COLUMN audit_logs.entity_id IS 'UUID of the affected entity record';
COMMENT ON COLUMN audit_logs.old_values IS 'JSONB snapshot of the record BEFORE the change (NULL on CREATE)';
COMMENT ON COLUMN audit_logs.new_values IS 'JSONB snapshot of the record AFTER the change (NULL on DELETE)';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address (supports IPv4 and IPv6)';
COMMENT ON COLUMN audit_logs.user_agent IS 'Client browser/agent string from request headers';
