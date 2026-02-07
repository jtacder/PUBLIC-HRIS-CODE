-- ============================================================================
-- Module 01: Dashboard
-- File: functions.sql
-- Database Functions and Views for Dashboard Aggregation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: get_dashboard_summary
-- Returns key metrics for the main dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_active_employees', (
            SELECT COUNT(*) FROM employees
            WHERE status = 'Active' AND is_deleted = false
        ),
        'today_present', (
            SELECT COUNT(DISTINCT employee_id) FROM attendance_logs
            WHERE scheduled_shift_date = CURRENT_DATE AND time_in IS NOT NULL
        ),
        'today_late', (
            SELECT COUNT(DISTINCT employee_id) FROM attendance_logs
            WHERE scheduled_shift_date = CURRENT_DATE AND late_minutes > 0
        ),
        'pending_leave_requests', (
            SELECT COUNT(*) FROM leave_requests WHERE status = 'Pending'
        ),
        'pending_cash_advances', (
            SELECT COUNT(*) FROM cash_advances WHERE status = 'Pending'
        ),
        'pending_expenses', (
            SELECT COUNT(*) FROM expenses WHERE status = 'Pending'
        ),
        'active_projects', (
            SELECT COUNT(*) FROM projects WHERE status = 'Active'
        ),
        'open_tasks', (
            SELECT COUNT(*) FROM tasks WHERE status IN ('Todo', 'In_Progress')
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_dashboard_summary IS 'Returns aggregated dashboard metrics as JSON';

-- ---------------------------------------------------------------------------
-- Function: get_employee_dashboard_summary
-- Returns personal dashboard metrics for a specific employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_dashboard_summary(p_employee_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'attendance_today', (
            SELECT json_build_object(
                'time_in', time_in,
                'time_out', time_out,
                'status', verification_status
            )
            FROM attendance_logs
            WHERE employee_id = p_employee_id
              AND scheduled_shift_date = CURRENT_DATE
            ORDER BY time_in DESC
            LIMIT 1
        ),
        'leave_balance', (
            SELECT json_agg(json_build_object(
                'type', lt.name,
                'remaining', la.remaining_days,
                'total', la.total_days
            ))
            FROM leave_allocations la
            JOIN leave_types lt ON lt.id = la.leave_type_id
            WHERE la.employee_id = p_employee_id
              AND la.year = EXTRACT(YEAR FROM CURRENT_DATE)
        ),
        'pending_requests', (
            SELECT json_build_object(
                'leave', (SELECT COUNT(*) FROM leave_requests WHERE employee_id = p_employee_id AND status = 'Pending'),
                'cash_advance', (SELECT COUNT(*) FROM cash_advances WHERE employee_id = p_employee_id AND status = 'Pending'),
                'expense', (SELECT COUNT(*) FROM expenses WHERE requester_id = p_employee_id AND status = 'Pending')
            )
        ),
        'assigned_tasks', (
            SELECT COUNT(*) FROM tasks
            WHERE assigned_to_id = p_employee_id AND status IN ('Todo', 'In_Progress')
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_dashboard_summary IS 'Returns personal dashboard metrics for a specific employee';

-- ---------------------------------------------------------------------------
-- Function: get_birthday_celebrants
-- Returns employees with birthdays this month
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_birthday_celebrants()
RETURNS TABLE(
    employee_id UUID,
    employee_no VARCHAR,
    full_name TEXT,
    birth_date DATE,
    department VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.employee_no,
        (e.first_name || ' ' || e.last_name)::TEXT,
        e.birth_date,
        e.department
    FROM employees e
    WHERE e.is_deleted = false
      AND e.status = 'Active'
      AND EXTRACT(MONTH FROM e.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    ORDER BY EXTRACT(DAY FROM e.birth_date);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_birthday_celebrants IS 'Returns active employees with birthdays in the current month';

-- ---------------------------------------------------------------------------
-- View: v_attendance_daily_summary
-- Materialized view for today's attendance widget
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_attendance_daily_summary AS
SELECT
    scheduled_shift_date AS date,
    COUNT(DISTINCT employee_id) AS total_present,
    COUNT(DISTINCT CASE WHEN late_minutes > 0 THEN employee_id END) AS total_late,
    COUNT(DISTINCT CASE WHEN time_out IS NOT NULL THEN employee_id END) AS total_completed,
    COUNT(DISTINCT CASE WHEN verification_status = 'Flagged' THEN employee_id END) AS total_flagged
FROM attendance_logs
WHERE scheduled_shift_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY scheduled_shift_date
ORDER BY scheduled_shift_date DESC;

COMMENT ON VIEW v_attendance_daily_summary IS 'Daily attendance summary for the last 30 days';
