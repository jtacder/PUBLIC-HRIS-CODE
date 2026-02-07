-- ============================================================================
-- Module 02: Employee Management
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on employees table
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Function: generate_employee_no
-- Generates sequential employee numbers in format EMP-YYYY-NNN
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_employee_no()
RETURNS VARCHAR AS $$
DECLARE
    current_year TEXT;
    next_seq INTEGER;
    new_employee_no VARCHAR;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(employee_no FROM 10) AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM employees
    WHERE employee_no LIKE 'EMP-' || current_year || '-%';

    new_employee_no := 'EMP-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');

    RETURN new_employee_no;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_employee_no IS 'Generates next sequential employee number (EMP-YYYY-NNN)';

-- ---------------------------------------------------------------------------
-- Function: generate_qr_token
-- Generates a unique 32-character alphanumeric token for QR attendance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_qr_token()
RETURNS VARCHAR(32) AS $$
DECLARE
    token VARCHAR(32);
    token_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 16 random bytes and encode as hex (32 chars)
        token := encode(gen_random_bytes(16), 'hex');

        -- Check uniqueness
        SELECT EXISTS(
            SELECT 1 FROM employees WHERE qr_token = token
        ) INTO token_exists;

        EXIT WHEN NOT token_exists;
    END LOOP;

    RETURN token;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_qr_token IS 'Generates a unique 32-character hex token for QR code scanning';

-- ---------------------------------------------------------------------------
-- Trigger Function: Auto-generate employee_no and qr_token on INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_employee_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generate employee_no if not provided
    IF NEW.employee_no IS NULL OR NEW.employee_no = '' THEN
        NEW.employee_no := generate_employee_no();
    END IF;

    -- Auto-generate qr_token if not provided
    IF NEW.qr_token IS NULL THEN
        NEW.qr_token := generate_qr_token();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_employee_defaults_before_insert
    BEFORE INSERT ON employees
    FOR EACH ROW
    EXECUTE FUNCTION trigger_employee_defaults();

-- ---------------------------------------------------------------------------
-- Function: soft_delete_employee
-- Performs soft deletion by setting is_deleted flag and clearing sensitive data
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION soft_delete_employee(p_employee_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE employees
    SET
        is_deleted = true,
        deleted_at = NOW(),
        status = 'Terminated',
        qr_token = NULL,
        updated_at = NOW()
    WHERE id = p_employee_id
      AND is_deleted = false;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_employee IS 'Soft-deletes an employee, clearing QR token and setting terminated status';

-- ---------------------------------------------------------------------------
-- Function: search_employees
-- Full-text search across employee name, number, email, department
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_employees(
    p_search_term TEXT,
    p_status VARCHAR DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL,
    p_role VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    employee_no VARCHAR,
    full_name TEXT,
    email VARCHAR,
    department VARCHAR,
    position VARCHAR,
    status VARCHAR,
    role VARCHAR,
    photo_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.employee_no,
        (e.first_name || ' ' || COALESCE(e.middle_name || ' ', '') || e.last_name)::TEXT AS full_name,
        e.email,
        e.department,
        e.position,
        e.status,
        e.role,
        e.photo_url
    FROM employees e
    WHERE e.is_deleted = false
      AND (
          p_search_term IS NULL
          OR e.first_name ILIKE '%' || p_search_term || '%'
          OR e.last_name ILIKE '%' || p_search_term || '%'
          OR e.employee_no ILIKE '%' || p_search_term || '%'
          OR e.email ILIKE '%' || p_search_term || '%'
      )
      AND (p_status IS NULL OR e.status = p_status)
      AND (p_department IS NULL OR e.department = p_department)
      AND (p_role IS NULL OR e.role = p_role)
    ORDER BY e.last_name, e.first_name
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_employees IS 'Search employees by name, number, email with optional filters';

-- ---------------------------------------------------------------------------
-- Function: get_employee_count_by_department
-- Returns employee count grouped by department
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_count_by_department()
RETURNS TABLE(department VARCHAR, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT e.department, COUNT(*)
    FROM employees e
    WHERE e.is_deleted = false AND e.status = 'Active'
    GROUP BY e.department
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_count_by_department IS 'Returns active employee counts grouped by department';

-- ---------------------------------------------------------------------------
-- Function: get_employee_count_by_status
-- Returns employee count grouped by status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_count_by_status()
RETURNS TABLE(status VARCHAR, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT e.status, COUNT(*)
    FROM employees e
    WHERE e.is_deleted = false
    GROUP BY e.status
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_count_by_status IS 'Returns employee counts grouped by employment status';
