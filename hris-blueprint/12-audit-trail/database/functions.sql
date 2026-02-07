-- ============================================================================
-- Module 12: Audit Trail
-- File: functions.sql
-- Database Functions for Audit Logging
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: create_audit_log
-- Convenience function to insert an audit log entry from application code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_entity_type VARCHAR(100),
    p_entity_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, p_ip_address, p_user_agent)
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_audit_log IS 'Creates an audit log entry and returns the new log ID';

-- ---------------------------------------------------------------------------
-- Function: get_audit_logs_filtered
-- Returns paginated audit logs with optional filters
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_logs_filtered(
    p_action VARCHAR DEFAULT NULL,
    p_entity_type VARCHAR DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    username VARCHAR,
    action VARCHAR,
    entity_type VARCHAR,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.user_id,
        u.username,
        al.action,
        al.entity_type,
        al.entity_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE (p_action IS NULL OR al.action = p_action)
      AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
      AND (p_user_id IS NULL OR al.user_id = p_user_id)
      AND (p_date_from IS NULL OR al.created_at >= p_date_from)
      AND (p_date_to IS NULL OR al.created_at <= p_date_to)
    ORDER BY al.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_audit_logs_filtered IS 'Returns paginated audit logs with optional action, entity, user, and date filters';

-- ---------------------------------------------------------------------------
-- Function: get_entity_audit_history
-- Returns the complete audit history for a specific entity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_entity_audit_history(
    p_entity_type VARCHAR,
    p_entity_id UUID
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    username VARCHAR,
    action VARCHAR,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.user_id,
        u.username,
        al.action,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.created_at
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.entity_type = p_entity_type
      AND al.entity_id = p_entity_id
    ORDER BY al.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_entity_audit_history IS 'Returns the full audit history for a specific entity, ordered chronologically';

-- ---------------------------------------------------------------------------
-- Function: get_audit_summary_by_user
-- Returns action counts per user for a given date range
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_audit_summary_by_user(
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_DATE - INTERVAL '30 days'),
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
    user_id UUID,
    username VARCHAR,
    action_count BIGINT,
    last_action_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.user_id,
        u.username,
        COUNT(*) AS action_count,
        MAX(al.created_at) AS last_action_at
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.created_at BETWEEN p_date_from AND p_date_to
    GROUP BY al.user_id, u.username
    ORDER BY action_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_audit_summary_by_user IS 'Returns audit action counts grouped by user for a date range (default: last 30 days)';

-- ---------------------------------------------------------------------------
-- View: v_recent_audit_activity
-- Shows the last 100 audit log entries with user details
-- Used by the dashboard activity feed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_recent_audit_activity AS
SELECT
    al.id,
    al.user_id,
    u.username,
    al.action,
    al.entity_type,
    al.entity_id,
    al.ip_address,
    al.created_at
FROM audit_logs al
LEFT JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC
LIMIT 100;

COMMENT ON VIEW v_recent_audit_activity IS 'Last 100 audit log entries with usernames for dashboard activity feed';
