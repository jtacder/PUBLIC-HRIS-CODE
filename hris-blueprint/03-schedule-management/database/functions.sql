-- ============================================================================
-- Module 03: Schedule Management
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_schedule_templates_updated_at
    BEFORE UPDATE ON schedule_templates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_employee_schedules_updated_at
    BEFORE UPDATE ON employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Function: get_employee_current_schedule
-- Returns the active schedule for an employee on a given date
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_current_schedule(
    p_employee_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    schedule_id UUID,
    shift_start VARCHAR,
    shift_end VARCHAR,
    work_days VARCHAR,
    template_name VARCHAR,
    is_night_shift BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        es.id,
        es.shift_start,
        es.shift_end,
        es.work_days,
        st.name,
        COALESCE(st.is_night_shift, false)
    FROM employee_schedules es
    LEFT JOIN schedule_templates st ON st.id = es.template_id
    WHERE es.employee_id = p_employee_id
      AND es.is_active = true
      AND es.effective_date <= p_date
      AND (es.end_date IS NULL OR es.end_date >= p_date)
    ORDER BY es.effective_date DESC
    LIMIT 1;

    -- Fallback to employee's default shift if no schedule assigned
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            NULL::UUID,
            e.shift_start_time,
            e.shift_end_time,
            e.shift_work_days,
            'Default'::VARCHAR,
            false
        FROM employees e
        WHERE e.id = p_employee_id;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_current_schedule IS 'Returns the active shift schedule for an employee on a given date';

-- ---------------------------------------------------------------------------
-- Function: assign_schedule_to_employees
-- Bulk-assign a schedule template to multiple employees
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_schedule_to_employees(
    p_template_id UUID,
    p_employee_ids UUID[],
    p_effective_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
    emp_id UUID;
    assigned_count INTEGER := 0;
    tmpl schedule_templates%ROWTYPE;
BEGIN
    -- Fetch the template
    SELECT * INTO tmpl FROM schedule_templates WHERE id = p_template_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Schedule template % not found', p_template_id;
    END IF;

    -- Deactivate current schedules for these employees
    UPDATE employee_schedules
    SET is_active = false, end_date = p_effective_date - 1
    WHERE employee_id = ANY(p_employee_ids)
      AND is_active = true;

    -- Insert new schedule assignments
    FOREACH emp_id IN ARRAY p_employee_ids LOOP
        INSERT INTO employee_schedules (
            employee_id, template_id, effective_date,
            shift_start, shift_end, work_days, is_active
        ) VALUES (
            emp_id, p_template_id, p_effective_date,
            tmpl.shift_start, tmpl.shift_end, tmpl.work_days, true
        );
        assigned_count := assigned_count + 1;
    END LOOP;

    RETURN assigned_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_schedule_to_employees IS 'Bulk-assigns a schedule template to multiple employees';

-- ---------------------------------------------------------------------------
-- Function: is_work_day
-- Checks if a given date is a work day for an employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_work_day(
    p_employee_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    v_work_days VARCHAR;
    v_day_name VARCHAR;
BEGIN
    -- Get current work days
    SELECT es.work_days INTO v_work_days
    FROM employee_schedules es
    WHERE es.employee_id = p_employee_id
      AND es.is_active = true
      AND es.effective_date <= p_date
      AND (es.end_date IS NULL OR es.end_date >= p_date)
    ORDER BY es.effective_date DESC
    LIMIT 1;

    -- Fallback to employee default
    IF v_work_days IS NULL THEN
        SELECT e.shift_work_days INTO v_work_days
        FROM employees e WHERE e.id = p_employee_id;
    END IF;

    IF v_work_days IS NULL THEN
        RETURN false;
    END IF;

    -- Get abbreviated day name
    v_day_name := TO_CHAR(p_date, 'Dy');

    RETURN v_work_days ILIKE '%' || v_day_name || '%';
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_work_day IS 'Checks if a given date is a scheduled work day for an employee';
