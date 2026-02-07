-- Module 04: Attendance System - Database Functions
-- Reverse-engineered from ElectroManage ERP documentation

-- Calculate total working minutes (excluding lunch deduction)
CREATE OR REPLACE FUNCTION calculate_working_minutes(
    p_time_in TIMESTAMP WITH TIME ZONE,
    p_time_out TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
    gross_minutes INTEGER,
    lunch_deduction INTEGER,
    net_minutes INTEGER
) AS $$
DECLARE
    v_gross INTEGER;
    v_lunch INTEGER;
BEGIN
    v_gross := EXTRACT(EPOCH FROM (p_time_out - p_time_in)) / 60;

    -- Apply 60-minute lunch deduction if worked >= 5 hours (300 minutes)
    IF v_gross >= 300 THEN
        v_lunch := 60;
    ELSE
        v_lunch := 0;
    END IF;

    RETURN QUERY SELECT v_gross, v_lunch, (v_gross - v_lunch);
END;
$$ LANGUAGE plpgsql;

-- Calculate late minutes based on scheduled shift start
CREATE OR REPLACE FUNCTION calculate_late_minutes(
    p_time_in TIMESTAMP WITH TIME ZONE,
    p_shift_start TIME,
    p_grace_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(
    late_minutes INTEGER,
    is_deductible BOOLEAN
) AS $$
DECLARE
    v_actual_time TIME;
    v_late INTEGER;
BEGIN
    v_actual_time := p_time_in::TIME;
    v_late := GREATEST(0, EXTRACT(EPOCH FROM (v_actual_time - p_shift_start)) / 60);

    RETURN QUERY SELECT
        v_late,
        (v_late >= p_grace_minutes);
END;
$$ LANGUAGE plpgsql;

-- Detect shift type based on clock-in hour
-- Day shift: 06:00-21:59, Night shift: 22:00-05:59
CREATE OR REPLACE FUNCTION detect_shift_type(p_clock_in_hour INTEGER)
RETURNS VARCHAR AS $$
BEGIN
    IF p_clock_in_hour >= 22 OR p_clock_in_hour < 6 THEN
        RETURN 'night';
    ELSE
        RETURN 'day';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Check if employee already clocked in (no time_out yet)
CREATE OR REPLACE FUNCTION has_active_clock_in(p_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM attendance_logs
        WHERE employee_id = p_employee_id
          AND time_out IS NULL
          AND time_in::DATE = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Get attendance summary for a date range
CREATE OR REPLACE FUNCTION get_attendance_summary(
    p_employee_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    days_present INTEGER,
    total_late_minutes BIGINT,
    total_overtime_minutes BIGINT,
    total_working_minutes BIGINT,
    verified_count INTEGER,
    flagged_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT scheduled_shift_date)::INTEGER AS days_present,
        COALESCE(SUM(late_minutes), 0)::BIGINT AS total_late_minutes,
        COALESCE(SUM(CASE WHEN ot_status = 'Approved' THEN overtime_minutes ELSE 0 END), 0)::BIGINT AS total_overtime_minutes,
        COALESCE(SUM(total_working_minutes), 0)::BIGINT AS total_working_minutes,
        COUNT(CASE WHEN verification_status = 'Verified' THEN 1 END)::INTEGER AS verified_count,
        COUNT(CASE WHEN verification_status = 'Flagged' THEN 1 END)::INTEGER AS flagged_count
    FROM attendance_logs
    WHERE employee_id = p_employee_id
      AND scheduled_shift_date BETWEEN p_start_date AND p_end_date
      AND time_out IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Auto-update total_working_minutes on clock-out
CREATE OR REPLACE FUNCTION update_working_minutes_on_clockout()
RETURNS TRIGGER AS $$
DECLARE
    v_gross INTEGER;
    v_lunch INTEGER;
BEGIN
    IF NEW.time_out IS NOT NULL AND OLD.time_out IS NULL THEN
        v_gross := EXTRACT(EPOCH FROM (NEW.time_out - NEW.time_in)) / 60;

        IF v_gross >= 300 THEN
            v_lunch := 60;
        ELSE
            v_lunch := 0;
        END IF;

        NEW.lunch_deduction_minutes := v_lunch;
        NEW.total_working_minutes := v_gross - v_lunch;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_working_minutes
    BEFORE UPDATE ON attendance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_working_minutes_on_clockout();
