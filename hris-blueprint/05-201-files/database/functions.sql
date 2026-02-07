-- ============================================================================
-- Module 05: 201 Files
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on employee_documents
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_employee_documents_updated_at
    BEFORE UPDATE ON employee_documents
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on employee_government_ids
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_employee_government_ids_updated_at
    BEFORE UPDATE ON employee_government_ids
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Function: check_expiring_documents
-- Returns documents expiring within a specified number of days
-- Used by dashboard alerts and notification system
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_expiring_documents(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
    document_id UUID,
    employee_id UUID,
    employee_name TEXT,
    document_type VARCHAR,
    file_name VARCHAR,
    expiry_date DATE,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ed.id,
        ed.employee_id,
        (e.first_name || ' ' || e.last_name)::TEXT,
        ed.document_type,
        ed.file_name,
        ed.expiry_date,
        (ed.expiry_date - CURRENT_DATE)::INTEGER AS days_until_expiry
    FROM employee_documents ed
    JOIN employees e ON e.id = ed.employee_id
    WHERE ed.is_active = true
      AND ed.expiry_date IS NOT NULL
      AND ed.expiry_date <= CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
      AND e.is_deleted = false
      AND e.status = 'Active'
    ORDER BY ed.expiry_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_expiring_documents IS 'Returns active employee documents expiring within N days (default 30)';

-- ---------------------------------------------------------------------------
-- Function: check_expiring_government_ids
-- Returns government IDs expiring within a specified number of days
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_expiring_government_ids(p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
    gov_id_record_id UUID,
    employee_id UUID,
    employee_name TEXT,
    id_type VARCHAR,
    id_number VARCHAR,
    expiry_date DATE,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        egi.id,
        egi.employee_id,
        (e.first_name || ' ' || e.last_name)::TEXT,
        egi.id_type,
        egi.id_number,
        egi.expiry_date,
        (egi.expiry_date - CURRENT_DATE)::INTEGER AS days_until_expiry
    FROM employee_government_ids egi
    JOIN employees e ON e.id = egi.employee_id
    WHERE egi.expiry_date IS NOT NULL
      AND egi.expiry_date <= CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
      AND e.is_deleted = false
      AND e.status = 'Active'
    ORDER BY egi.expiry_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_expiring_government_ids IS 'Returns government IDs expiring within N days (default 30)';

-- ---------------------------------------------------------------------------
-- Function: get_complete_201_file
-- Assembles the complete 201 file for an employee as a JSON object
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_complete_201_file(p_employee_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'employee', (
            SELECT row_to_json(e.*)
            FROM employees e
            WHERE e.id = p_employee_id AND e.is_deleted = false
        ),
        'documents', (
            SELECT COALESCE(json_agg(row_to_json(ed.*) ORDER BY ed.created_at DESC), '[]'::JSON)
            FROM employee_documents ed
            WHERE ed.employee_id = p_employee_id AND ed.is_active = true
        ),
        'government_ids', (
            SELECT COALESCE(json_agg(row_to_json(egi.*) ORDER BY egi.id_type), '[]'::JSON)
            FROM employee_government_ids egi
            WHERE egi.employee_id = p_employee_id
        ),
        'disciplinary_records', (
            SELECT COALESCE(json_agg(row_to_json(dr.*) ORDER BY dr.created_at DESC), '[]'::JSON)
            FROM disciplinary_records dr
            WHERE dr.employee_id = p_employee_id
        ),
        'document_summary', (
            SELECT json_build_object(
                'total', COUNT(*),
                'verified', COUNT(*) FILTER (WHERE ed.verified = true),
                'unverified', COUNT(*) FILTER (WHERE ed.verified = false),
                'expiring_soon', COUNT(*) FILTER (WHERE ed.expiry_date IS NOT NULL AND ed.expiry_date <= CURRENT_DATE + INTERVAL '30 days' AND ed.expiry_date > CURRENT_DATE),
                'expired', COUNT(*) FILTER (WHERE ed.expiry_date IS NOT NULL AND ed.expiry_date <= CURRENT_DATE)
            )
            FROM employee_documents ed
            WHERE ed.employee_id = p_employee_id AND ed.is_active = true
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_complete_201_file IS 'Assembles complete 201 file for an employee including documents, government IDs, and disciplinary records';

-- ---------------------------------------------------------------------------
-- Trigger Function: Set verified_at timestamp when document is verified
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_document_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- When verified changes from false to true, set verified_at
    IF NEW.verified = true AND (OLD.verified = false OR OLD.verified IS NULL) THEN
        NEW.verified_at := NOW();
    END IF;

    -- Prevent un-verification (verified is immutable once set to true)
    IF OLD.verified = true AND NEW.verified = false THEN
        RAISE EXCEPTION 'Cannot un-verify a document. Verification is permanent.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_employee_document_verification
    BEFORE UPDATE ON employee_documents
    FOR EACH ROW
    WHEN (OLD.verified IS DISTINCT FROM NEW.verified)
    EXECUTE FUNCTION trigger_document_verification();

-- ---------------------------------------------------------------------------
-- View: v_document_expiry_summary
-- Summary of document expiry status per employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_document_expiry_summary AS
SELECT
    e.id AS employee_id,
    e.employee_no,
    (e.first_name || ' ' || e.last_name) AS employee_name,
    e.department,
    COUNT(ed.id) AS total_documents,
    COUNT(ed.id) FILTER (WHERE ed.verified = true) AS verified_count,
    COUNT(ed.id) FILTER (WHERE ed.expiry_date IS NOT NULL AND ed.expiry_date < CURRENT_DATE) AS expired_count,
    COUNT(ed.id) FILTER (WHERE ed.expiry_date IS NOT NULL AND ed.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS expiring_soon_count,
    MIN(ed.expiry_date) FILTER (WHERE ed.expiry_date >= CURRENT_DATE) AS nearest_expiry
FROM employees e
LEFT JOIN employee_documents ed ON ed.employee_id = e.id AND ed.is_active = true
WHERE e.is_deleted = false AND e.status = 'Active'
GROUP BY e.id, e.employee_no, e.first_name, e.last_name, e.department
ORDER BY expired_count DESC, expiring_soon_count DESC;

COMMENT ON VIEW v_document_expiry_summary IS 'Summary of document verification and expiry status per active employee';
