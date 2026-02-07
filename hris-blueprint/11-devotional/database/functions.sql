-- ============================================================================
-- Module 11: Devotional System
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on devotionals table
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_devotionals_updated_at
    BEFORE UPDATE ON devotionals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Function: get_todays_devotional
-- Returns today's devotional with read status for a given employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_todays_devotional(p_employee_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', d.id,
        'title', d.title,
        'content', d.content,
        'scripture_reference', d.scripture_reference,
        'date', d.date,
        'author', d.author,
        'created_at', d.created_at,
        'is_read', CASE
            WHEN p_employee_id IS NOT NULL THEN EXISTS (
                SELECT 1 FROM devotional_reading_logs drl
                WHERE drl.devotional_id = d.id
                  AND drl.employee_id = p_employee_id
            )
            ELSE false
        END
    ) INTO result
    FROM devotionals d
    WHERE d.date = CURRENT_DATE
    ORDER BY d.created_at DESC
    LIMIT 1;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_todays_devotional IS 'Returns today''s devotional content with optional read status for a specific employee';

-- ---------------------------------------------------------------------------
-- Function: get_devotional_engagement_stats
-- Returns engagement statistics for a specific devotional
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_devotional_engagement_stats(p_devotional_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'devotional_id', p_devotional_id,
        'total_readers', (
            SELECT COUNT(*) FROM devotional_reading_logs
            WHERE devotional_id = p_devotional_id
        ),
        'total_active_employees', (
            SELECT COUNT(*) FROM employees
            WHERE status = 'Active' AND is_deleted = false
        ),
        'read_percentage', (
            SELECT ROUND(
                (COUNT(drl.id)::NUMERIC /
                 NULLIF((SELECT COUNT(*) FROM employees WHERE status = 'Active' AND is_deleted = false), 0)
                ) * 100, 1
            )
            FROM devotional_reading_logs drl
            WHERE drl.devotional_id = p_devotional_id
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_devotional_engagement_stats IS 'Returns read count and engagement percentage for a specific devotional';

-- ---------------------------------------------------------------------------
-- Function: get_employee_reading_streak
-- Returns the current consecutive-day reading streak for an employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_reading_streak(p_employee_id UUID)
RETURNS INTEGER AS $$
DECLARE
    streak INTEGER := 0;
    check_date DATE := CURRENT_DATE;
    has_read BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM devotional_reading_logs drl
            JOIN devotionals d ON d.id = drl.devotional_id
            WHERE drl.employee_id = p_employee_id
              AND d.date = check_date
        ) INTO has_read;

        EXIT WHEN NOT has_read;

        streak := streak + 1;
        check_date := check_date - INTERVAL '1 day';
    END LOOP;

    RETURN streak;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_reading_streak IS 'Returns the number of consecutive days an employee has read devotionals ending today';

-- ---------------------------------------------------------------------------
-- View: v_devotional_engagement_summary
-- Summarizes reading engagement per devotional
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_devotional_engagement_summary AS
SELECT
    d.id AS devotional_id,
    d.title,
    d.date,
    d.author,
    COUNT(drl.id) AS read_count,
    (SELECT COUNT(*) FROM employees WHERE status = 'Active' AND is_deleted = false) AS total_employees,
    ROUND(
        (COUNT(drl.id)::NUMERIC /
         NULLIF((SELECT COUNT(*) FROM employees WHERE status = 'Active' AND is_deleted = false), 0)
        ) * 100, 1
    ) AS engagement_percentage
FROM devotionals d
LEFT JOIN devotional_reading_logs drl ON drl.devotional_id = d.id
GROUP BY d.id, d.title, d.date, d.author
ORDER BY d.date DESC;

COMMENT ON VIEW v_devotional_engagement_summary IS 'Aggregated engagement metrics per devotional entry';
