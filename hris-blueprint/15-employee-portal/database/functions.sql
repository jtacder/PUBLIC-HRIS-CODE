-- ============================================================================
-- Module 15: Employee Portal (Self-Service)
-- File: functions.sql
-- Database Functions and Views for Self-Service Data Aggregation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: get_self_service_overview
-- Returns a comprehensive overview for an employee's self-service dashboard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_self_service_overview(p_employee_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        -- Today's attendance status
        'attendance_today', (
            SELECT json_build_object(
                'time_in', al.time_in,
                'time_out', al.time_out,
                'late_minutes', al.late_minutes,
                'overtime_minutes', al.overtime_minutes
            )
            FROM attendance_logs al
            WHERE al.employee_id = p_employee_id
              AND al.scheduled_shift_date = CURRENT_DATE
            ORDER BY al.time_in DESC
            LIMIT 1
        ),
        -- Pending tasks count
        'pending_tasks', (
            SELECT COUNT(*) FROM tasks
            WHERE assigned_to_id = p_employee_id
              AND status IN ('Todo', 'In_Progress')
        ),
        -- Leave balances
        'leave_balances', (
            SELECT json_agg(json_build_object(
                'leave_type', lt.name,
                'total_days', la.total_days,
                'used_days', la.used_days,
                'remaining_days', la.remaining_days
            ))
            FROM leave_allocations la
            JOIN leave_types lt ON lt.id = la.leave_type_id
            WHERE la.employee_id = p_employee_id
              AND la.year = EXTRACT(YEAR FROM CURRENT_DATE)
        ),
        -- Pending requests
        'pending_requests', json_build_object(
            'leave', (
                SELECT COUNT(*) FROM leave_requests
                WHERE employee_id = p_employee_id AND status = 'Pending'
            ),
            'cash_advance', (
                SELECT COUNT(*) FROM cash_advances
                WHERE employee_id = p_employee_id AND status = 'Pending'
            ),
            'expense', (
                SELECT COUNT(*) FROM expenses
                WHERE requester_id = p_employee_id AND status = 'Pending'
            )
        ),
        -- Unread devotional today
        'devotional_unread', (
            SELECT NOT EXISTS (
                SELECT 1 FROM devotional_reading_logs drl
                JOIN devotionals d ON d.id = drl.devotional_id
                WHERE drl.employee_id = p_employee_id
                  AND d.date = CURRENT_DATE
            )
            AND EXISTS (
                SELECT 1 FROM devotionals WHERE date = CURRENT_DATE
            )
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_self_service_overview IS 'Returns aggregated self-service dashboard data for an employee';

-- ---------------------------------------------------------------------------
-- View: v_employee_attendance_summary
-- Monthly attendance summary for self-service display
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_employee_attendance_summary AS
SELECT
    al.employee_id,
    DATE_TRUNC('month', al.scheduled_shift_date) AS month,
    COUNT(*) AS total_days_present,
    COUNT(CASE WHEN al.late_minutes > 0 THEN 1 END) AS total_days_late,
    SUM(COALESCE(al.late_minutes, 0)) AS total_late_minutes,
    SUM(COALESCE(al.overtime_minutes, 0)) AS total_overtime_minutes,
    COUNT(CASE WHEN al.time_out IS NOT NULL THEN 1 END) AS total_days_completed
FROM attendance_logs al
WHERE al.scheduled_shift_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY al.employee_id, DATE_TRUNC('month', al.scheduled_shift_date)
ORDER BY al.employee_id, month DESC;

COMMENT ON VIEW v_employee_attendance_summary IS 'Monthly attendance summary per employee for self-service display (last 12 months)';

-- ---------------------------------------------------------------------------
-- View: v_employee_payslip_list
-- Payslip list view for self-service (released payrolls only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_employee_payslip_list AS
SELECT
    pr.id,
    pr.employee_id,
    pr.pay_period_start,
    pr.pay_period_end,
    pr.gross_pay,
    pr.total_deductions,
    pr.net_pay,
    pr.status,
    pr.created_at
FROM payroll_records pr
WHERE pr.status IN ('Approved', 'Released')
ORDER BY pr.pay_period_end DESC;

COMMENT ON VIEW v_employee_payslip_list IS 'Payslip list for self-service portal (only approved/released payrolls)';

-- ---------------------------------------------------------------------------
-- Function: get_employee_profile_for_self_service
-- Returns employee profile data with only self-service-viewable fields
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_profile_for_self_service(p_employee_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', e.id,
        'employee_no', e.employee_no,
        'first_name', e.first_name,
        'last_name', e.last_name,
        'middle_name', e.middle_name,
        'suffix', e.suffix,
        'email', e.email,
        'phone', e.phone,
        'address', e.address,
        'city', e.city,
        'province', e.province,
        'zip_code', e.zip_code,
        'birth_date', e.birth_date,
        'gender', e.gender,
        'civil_status', e.civil_status,
        'emergency_contact_name', e.emergency_contact_name,
        'emergency_contact_phone', e.emergency_contact_phone,
        'emergency_contact_relationship', e.emergency_contact_relationship,
        'position', e.position,
        'department', e.department,
        'hire_date', e.hire_date,
        'status', e.status,
        'photo_url', e.photo_url,
        'shift_start_time', e.shift_start_time,
        'shift_end_time', e.shift_end_time,
        'shift_work_days', e.shift_work_days
    ) INTO result
    FROM employees e
    WHERE e.id = p_employee_id
      AND e.is_deleted = false;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_profile_for_self_service IS 'Returns employee profile data suitable for self-service display (excludes sensitive fields like rates, government IDs)';

-- ---------------------------------------------------------------------------
-- Function: get_employee_request_history
-- Returns a unified view of all request types for an employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_request_history(
    p_employee_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    request_type VARCHAR,
    request_id UUID,
    description TEXT,
    status VARCHAR,
    submitted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    (
        SELECT
            'Leave'::VARCHAR AS request_type,
            lr.id AS request_id,
            (lt.name || ': ' || lr.start_date || ' to ' || lr.end_date)::TEXT AS description,
            lr.status::VARCHAR,
            lr.created_at AS submitted_at
        FROM leave_requests lr
        JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.employee_id = p_employee_id

        UNION ALL

        SELECT
            'Cash Advance'::VARCHAR,
            ca.id,
            ('Cash Advance: PHP ' || ca.amount)::TEXT,
            ca.status::VARCHAR,
            ca.created_at
        FROM cash_advances ca
        WHERE ca.employee_id = p_employee_id

        UNION ALL

        SELECT
            'Expense'::VARCHAR,
            ex.id,
            (ex.category || ': PHP ' || ex.amount)::TEXT,
            ex.status::VARCHAR,
            ex.created_at
        FROM expenses ex
        WHERE ex.requester_id = p_employee_id
    )
    ORDER BY submitted_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_request_history IS 'Returns unified request history (leave, cash advance, expense) for an employee';
