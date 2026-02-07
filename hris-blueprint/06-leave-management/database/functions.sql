-- ============================================================================
-- Module 06: Leave Management
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on leave_types
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_leave_types_updated_at
    BEFORE UPDATE ON leave_types
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on leave_requests
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_leave_requests_updated_at
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on leave_allocations
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_leave_allocations_updated_at
    BEFORE UPDATE ON leave_allocations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Function: calculate_leave_balance
-- Returns the current available leave balance for an employee and leave type
-- Takes accrual mode into account for monthly pro-rating
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_leave_balance(
    p_employee_id UUID,
    p_leave_type_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
    total_days DECIMAL(5,2),
    used_days DECIMAL(5,2),
    remaining_days DECIMAL(5,2),
    accrual_mode VARCHAR,
    accrued_to_date DECIMAL(5,2)
) AS $$
DECLARE
    v_accrual_mode VARCHAR;
    v_days_per_year INTEGER;
    v_hire_date DATE;
    v_completed_months INTEGER;
    v_accrued DECIMAL(5,2);
BEGIN
    -- Get leave type accrual mode
    SELECT lt.accrual_mode, lt.days_per_year
    INTO v_accrual_mode, v_days_per_year
    FROM leave_types lt
    WHERE lt.id = p_leave_type_id;

    -- Get employee hire date for pro-rating
    SELECT e.hire_date INTO v_hire_date
    FROM employees e
    WHERE e.id = p_employee_id;

    -- Calculate completed months in the year
    IF v_accrual_mode = 'monthly' THEN
        IF EXTRACT(YEAR FROM v_hire_date) = p_year THEN
            -- New hire: months from hire date to now
            v_completed_months := GREATEST(0,
                EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER - EXTRACT(MONTH FROM v_hire_date)::INTEGER + 1
            );
        ELSE
            -- Existing employee: months from Jan to now
            v_completed_months := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
        END IF;
        v_accrued := ROUND((v_days_per_year::DECIMAL / 12.0) * v_completed_months, 2);
    ELSE
        -- Annual: full allocation from Day 1
        v_accrued := v_days_per_year;
    END IF;

    RETURN QUERY
    SELECT
        la.total_days,
        la.used_days,
        la.remaining_days,
        v_accrual_mode,
        v_accrued
    FROM leave_allocations la
    WHERE la.employee_id = p_employee_id
      AND la.leave_type_id = p_leave_type_id
      AND la.year = p_year;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_leave_balance IS 'Returns leave balance with accrual calculation for an employee/type/year';

-- ---------------------------------------------------------------------------
-- Function: check_leave_overlap
-- Checks if a proposed leave request overlaps with existing approved/pending
-- requests for the same employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_leave_overlap(
    p_employee_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_exclude_request_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_overlap_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM leave_requests lr
        WHERE lr.employee_id = p_employee_id
          AND lr.status IN ('Pending', 'Approved')
          AND lr.start_date <= p_end_date
          AND lr.end_date >= p_start_date
          AND (p_exclude_request_id IS NULL OR lr.id != p_exclude_request_id)
    ) INTO v_overlap_exists;

    RETURN v_overlap_exists;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_leave_overlap IS 'Returns true if the proposed date range overlaps with existing pending/approved leave requests';

-- ---------------------------------------------------------------------------
-- Function: approve_leave_request
-- Approves a leave request and updates the allocation balance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_leave_request(
    p_request_id UUID,
    p_approved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_request leave_requests%ROWTYPE;
    v_remaining DECIMAL(5,2);
BEGIN
    -- Fetch the request
    SELECT * INTO v_request FROM leave_requests WHERE id = p_request_id;

    -- Validate current status
    IF v_request.status != 'Pending' THEN
        RAISE EXCEPTION 'Leave request is not in Pending status. Current status: %', v_request.status;
    END IF;

    -- Check remaining balance
    SELECT la.remaining_days INTO v_remaining
    FROM leave_allocations la
    WHERE la.employee_id = v_request.employee_id
      AND la.leave_type_id = v_request.leave_type_id
      AND la.year = EXTRACT(YEAR FROM v_request.start_date)::INTEGER;

    IF v_remaining IS NULL THEN
        RAISE EXCEPTION 'No leave allocation found for this employee and leave type in year %',
            EXTRACT(YEAR FROM v_request.start_date)::INTEGER;
    END IF;

    IF v_remaining < v_request.days_count THEN
        RAISE EXCEPTION 'Insufficient leave balance. Remaining: %, Requested: %',
            v_remaining, v_request.days_count;
    END IF;

    -- Update request status
    UPDATE leave_requests
    SET status = 'Approved',
        approved_by = p_approved_by,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Update allocation balance
    UPDATE leave_allocations
    SET used_days = used_days + v_request.days_count,
        remaining_days = remaining_days - v_request.days_count,
        updated_at = NOW()
    WHERE employee_id = v_request.employee_id
      AND leave_type_id = v_request.leave_type_id
      AND year = EXTRACT(YEAR FROM v_request.start_date)::INTEGER;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_leave_request IS 'Approves a leave request and decrements the leave allocation balance';

-- ---------------------------------------------------------------------------
-- Function: allocate_annual_leave
-- Creates leave allocations for all active employees for a given year
-- Called at the start of each year (or on demand by HR)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION allocate_annual_leave(
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_employee RECORD;
    v_leave_type RECORD;
    v_total_days DECIMAL(5,2);
    v_completed_months INTEGER;
BEGIN
    -- For each active employee
    FOR v_employee IN
        SELECT id, hire_date FROM employees
        WHERE is_deleted = false AND status IN ('Active', 'Probationary')
    LOOP
        -- For each active leave type
        FOR v_leave_type IN
            SELECT id, days_per_year, accrual_mode FROM leave_types
            WHERE is_active = true
        LOOP
            -- Calculate total days based on accrual mode
            IF v_leave_type.accrual_mode = 'annual' THEN
                v_total_days := v_leave_type.days_per_year;
            ELSE
                -- Monthly: pro-rate for new hires in the current year
                IF EXTRACT(YEAR FROM v_employee.hire_date) = p_year THEN
                    v_completed_months := 12 - EXTRACT(MONTH FROM v_employee.hire_date)::INTEGER + 1;
                    v_total_days := ROUND((v_leave_type.days_per_year::DECIMAL / 12.0) * v_completed_months, 2);
                ELSE
                    v_total_days := v_leave_type.days_per_year;
                END IF;
            END IF;

            -- Insert allocation (skip if already exists)
            INSERT INTO leave_allocations (employee_id, leave_type_id, year, total_days, used_days, remaining_days)
            VALUES (v_employee.id, v_leave_type.id, p_year, v_total_days, 0, v_total_days)
            ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;

            v_count := v_count + 1;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION allocate_annual_leave IS 'Bulk-creates leave allocations for all active employees for a given year with pro-rating for monthly accrual';

-- ---------------------------------------------------------------------------
-- Function: get_leave_summary_for_employee
-- Returns a summary of all leave balances for an employee in a given year
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_leave_summary_for_employee(
    p_employee_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
    leave_type_name VARCHAR,
    is_paid BOOLEAN,
    total_days DECIMAL(5,2),
    used_days DECIMAL(5,2),
    remaining_days DECIMAL(5,2),
    pending_days DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lt.name,
        lt.is_paid,
        COALESCE(la.total_days, 0::DECIMAL(5,2)),
        COALESCE(la.used_days, 0::DECIMAL(5,2)),
        COALESCE(la.remaining_days, 0::DECIMAL(5,2)),
        COALESCE((
            SELECT SUM(lr.days_count)
            FROM leave_requests lr
            WHERE lr.employee_id = p_employee_id
              AND lr.leave_type_id = lt.id
              AND lr.status = 'Pending'
              AND EXTRACT(YEAR FROM lr.start_date) = p_year
        ), 0::DECIMAL(5,2)) AS pending_days
    FROM leave_types lt
    LEFT JOIN leave_allocations la ON la.leave_type_id = lt.id
        AND la.employee_id = p_employee_id
        AND la.year = p_year
    WHERE lt.is_active = true
    ORDER BY lt.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_leave_summary_for_employee IS 'Returns complete leave balance summary for an employee across all active leave types';

-- ---------------------------------------------------------------------------
-- View: v_pending_leave_requests
-- Pending leave requests with employee and leave type details for HR queue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pending_leave_requests AS
SELECT
    lr.id,
    lr.employee_id,
    e.employee_no,
    (e.first_name || ' ' || e.last_name) AS employee_name,
    e.department,
    lt.name AS leave_type,
    lt.is_paid,
    lr.start_date,
    lr.end_date,
    lr.days_count,
    lr.reason,
    lr.created_at AS requested_at,
    la.remaining_days AS balance_before
FROM leave_requests lr
JOIN employees e ON e.id = lr.employee_id
JOIN leave_types lt ON lt.id = lr.leave_type_id
LEFT JOIN leave_allocations la ON la.employee_id = lr.employee_id
    AND la.leave_type_id = lr.leave_type_id
    AND la.year = EXTRACT(YEAR FROM lr.start_date)::INTEGER
WHERE lr.status = 'Pending'
ORDER BY lr.created_at ASC;

COMMENT ON VIEW v_pending_leave_requests IS 'Pending leave requests queue for HR/Admin review with employee details and current balance';
