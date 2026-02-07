-- ============================================================================
-- Module 09: Disciplinary
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on disciplinary_records
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_disciplinary_records_updated_at
    BEFORE UPDATE ON disciplinary_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger Function: Auto-calculate response deadline on NTE creation
-- Sets response_deadline = violation_date + 5 calendar days
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_disciplinary_set_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- Set response deadline to 5 calendar days from issuance
    IF NEW.response_deadline IS NULL THEN
        NEW.response_deadline := (NEW.issued_at::DATE + INTERVAL '5 days')::DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_disciplinary_deadline_on_insert
    BEFORE INSERT ON disciplinary_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_disciplinary_set_deadline();

-- ---------------------------------------------------------------------------
-- Trigger Function: Validate disciplinary status transitions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_disciplinary_status_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Valid transitions:
    -- Issued -> Explanation_Received (employee submits explanation)
    -- Issued -> Resolved (HR resolves without explanation)
    -- Explanation_Received -> Resolved (HR resolves after explanation)
    IF OLD.status = 'Issued' AND NEW.status NOT IN ('Issued', 'Explanation_Received', 'Resolved') THEN
        RAISE EXCEPTION 'Invalid status transition from Issued to %. Allowed: Explanation_Received, Resolved', NEW.status;
    END IF;

    IF OLD.status = 'Explanation_Received' AND NEW.status NOT IN ('Explanation_Received', 'Resolved') THEN
        RAISE EXCEPTION 'Invalid status transition from Explanation_Received to %. Allowed: Resolved', NEW.status;
    END IF;

    IF OLD.status = 'Resolved' THEN
        RAISE EXCEPTION 'Cannot change status from Resolved. This is a terminal state.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_disciplinary_validate_status
    BEFORE UPDATE ON disciplinary_records
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trigger_disciplinary_status_validation();

-- ---------------------------------------------------------------------------
-- Trigger Function: Set resolved_at timestamp on resolution
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_disciplinary_resolution()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
        NEW.resolved_at := NOW();

        -- Sanction is required for resolution
        IF NEW.sanction IS NULL THEN
            RAISE EXCEPTION 'Sanction is required when resolving a disciplinary record';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_disciplinary_on_resolve
    BEFORE UPDATE ON disciplinary_records
    FOR EACH ROW
    WHEN (NEW.status = 'Resolved' AND OLD.status != 'Resolved')
    EXECUTE FUNCTION trigger_disciplinary_resolution();

-- ---------------------------------------------------------------------------
-- Function: submit_disciplinary_explanation
-- Handles employee explanation submission with status transition
-- and late submission detection
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION submit_disciplinary_explanation(
    p_record_id UUID,
    p_explanation_text TEXT,
    p_submitted_by UUID,
    p_attachment_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_record disciplinary_records%ROWTYPE;
    v_is_late BOOLEAN;
BEGIN
    -- Fetch the disciplinary record
    SELECT * INTO v_record
    FROM disciplinary_records
    WHERE id = p_record_id;

    -- Validate status
    IF v_record.status != 'Issued' THEN
        RAISE EXCEPTION 'Can only submit explanation for records in Issued status. Current: %', v_record.status;
    END IF;

    -- Check if submission is late
    v_is_late := CURRENT_DATE > v_record.response_deadline;

    -- Insert explanation
    INSERT INTO disciplinary_explanations (
        disciplinary_record_id, explanation_text, attachment_url,
        is_late, submitted_by
    ) VALUES (
        p_record_id, p_explanation_text, p_attachment_url,
        v_is_late, p_submitted_by
    );

    -- Update record status
    UPDATE disciplinary_records
    SET status = 'Explanation_Received',
        updated_at = NOW()
    WHERE id = p_record_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION submit_disciplinary_explanation IS 'Submits employee explanation for an NTE with late detection and status transition';

-- ---------------------------------------------------------------------------
-- Function: get_employee_disciplinary_history
-- Returns complete disciplinary history for an employee
-- Used by the 201 file module and disciplinary detail page
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_disciplinary_history(p_employee_id UUID)
RETURNS TABLE(
    record_id UUID,
    violation VARCHAR,
    violation_category VARCHAR,
    violation_date DATE,
    status VARCHAR,
    sanction VARCHAR,
    issued_at TIMESTAMP WITH TIME ZONE,
    response_deadline DATE,
    has_explanation BOOLEAN,
    explanation_is_late BOOLEAN,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.id,
        dr.violation,
        dr.violation_category,
        dr.violation_date,
        dr.status,
        dr.sanction,
        dr.issued_at,
        dr.response_deadline,
        EXISTS(SELECT 1 FROM disciplinary_explanations de WHERE de.disciplinary_record_id = dr.id) AS has_explanation,
        COALESCE((SELECT de.is_late FROM disciplinary_explanations de WHERE de.disciplinary_record_id = dr.id), false) AS explanation_is_late,
        dr.resolved_at,
        dr.resolution_notes
    FROM disciplinary_records dr
    WHERE dr.employee_id = p_employee_id
    ORDER BY dr.issued_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_disciplinary_history IS 'Returns complete disciplinary history for an employee including explanation and resolution details';

-- ---------------------------------------------------------------------------
-- Function: get_overdue_ntes
-- Returns NTEs where the response deadline has passed without explanation
-- Used for HR notifications and dashboard alerts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_overdue_ntes()
RETURNS TABLE(
    record_id UUID,
    employee_id UUID,
    employee_name TEXT,
    department VARCHAR,
    violation VARCHAR,
    issued_at TIMESTAMP WITH TIME ZONE,
    response_deadline DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.id,
        dr.employee_id,
        (e.first_name || ' ' || e.last_name)::TEXT,
        e.department,
        dr.violation,
        dr.issued_at,
        dr.response_deadline,
        (CURRENT_DATE - dr.response_deadline)::INTEGER AS days_overdue
    FROM disciplinary_records dr
    JOIN employees e ON e.id = dr.employee_id
    WHERE dr.status = 'Issued'
      AND dr.response_deadline < CURRENT_DATE
      AND NOT EXISTS (
          SELECT 1 FROM disciplinary_explanations de
          WHERE de.disciplinary_record_id = dr.id
      )
    ORDER BY dr.response_deadline ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_overdue_ntes IS 'Returns NTEs past their response deadline without explanation, for HR follow-up';

-- ---------------------------------------------------------------------------
-- Function: get_employee_sanction_count
-- Returns count of each sanction type for an employee
-- Used to inform escalation decisions when resolving new NTEs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_sanction_count(p_employee_id UUID)
RETURNS TABLE(
    sanction_type VARCHAR,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dr.sanction,
        COUNT(*)
    FROM disciplinary_records dr
    WHERE dr.employee_id = p_employee_id
      AND dr.status = 'Resolved'
      AND dr.sanction IS NOT NULL
    GROUP BY dr.sanction
    ORDER BY
        CASE dr.sanction
            WHEN 'verbal_warning' THEN 1
            WHEN 'written_warning' THEN 2
            WHEN 'suspension' THEN 3
            WHEN 'termination' THEN 4
        END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_sanction_count IS 'Returns sanction history counts for an employee to inform escalation decisions';

-- ---------------------------------------------------------------------------
-- View: v_active_disciplinary_records
-- Active (unresolved) NTEs with employee details for HR queue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_active_disciplinary_records AS
SELECT
    dr.id,
    dr.employee_id,
    e.employee_no,
    (e.first_name || ' ' || e.last_name) AS employee_name,
    e.department,
    dr.violation,
    dr.violation_category,
    dr.violation_date,
    dr.status,
    dr.issued_at,
    dr.response_deadline,
    CASE
        WHEN dr.status = 'Issued' AND dr.response_deadline < CURRENT_DATE THEN 'Overdue'
        WHEN dr.status = 'Issued' AND dr.response_deadline = CURRENT_DATE THEN 'Due Today'
        WHEN dr.status = 'Issued' THEN 'Pending Response'
        WHEN dr.status = 'Explanation_Received' THEN 'Awaiting Resolution'
        ELSE dr.status
    END AS display_status,
    (dr.response_deadline - CURRENT_DATE)::INTEGER AS days_until_deadline
FROM disciplinary_records dr
JOIN employees e ON e.id = dr.employee_id
WHERE dr.status IN ('Issued', 'Explanation_Received')
ORDER BY
    CASE dr.status
        WHEN 'Explanation_Received' THEN 1
        WHEN 'Issued' THEN 2
    END,
    dr.response_deadline ASC;

COMMENT ON VIEW v_active_disciplinary_records IS 'Active (unresolved) NTEs with employee details and deadline status for HR queue';
