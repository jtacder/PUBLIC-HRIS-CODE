-- ============================================================================
-- Module 16: Project Management
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on projects table
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Function: calculate_haversine_distance
-- Calculates the distance in meters between two GPS coordinates
-- Used for geofence validation during attendance clock-in
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_haversine_distance(
    p_lat1 DECIMAL(10, 7),
    p_lng1 DECIMAL(10, 7),
    p_lat2 DECIMAL(10, 7),
    p_lng2 DECIMAL(10, 7)
)
RETURNS DECIMAL AS $$
DECLARE
    v_earth_radius CONSTANT DECIMAL := 6371000; -- meters
    v_dlat DECIMAL;
    v_dlng DECIMAL;
    v_a DECIMAL;
    v_c DECIMAL;
BEGIN
    -- Convert degrees to radians
    v_dlat := RADIANS(p_lat2 - p_lat1);
    v_dlng := RADIANS(p_lng2 - p_lng1);

    -- Haversine formula
    v_a := SIN(v_dlat / 2) * SIN(v_dlat / 2)
          + COS(RADIANS(p_lat1)) * COS(RADIANS(p_lat2))
          * SIN(v_dlng / 2) * SIN(v_dlng / 2);

    v_c := 2 * ATAN2(SQRT(v_a), SQRT(1 - v_a));

    RETURN v_earth_radius * v_c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_haversine_distance IS 'Calculates distance in meters between two GPS coordinates using the Haversine formula';

-- ---------------------------------------------------------------------------
-- Function: check_geofence
-- Checks if a GPS coordinate is within a project's geofence radius
-- Returns true if within the geofence, false otherwise
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_geofence(
    p_project_id UUID,
    p_lat DECIMAL(10, 7),
    p_lng DECIMAL(10, 7)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_project_lat DECIMAL(10, 7);
    v_project_lng DECIMAL(10, 7);
    v_geo_radius INTEGER;
    v_distance DECIMAL;
BEGIN
    -- Get project geofence center and radius
    SELECT location_lat, location_lng, geo_radius
    INTO v_project_lat, v_project_lng, v_geo_radius
    FROM projects
    WHERE id = p_project_id;

    -- If no geofence configured, return true (no restriction)
    IF v_project_lat IS NULL OR v_project_lng IS NULL THEN
        RETURN true;
    END IF;

    -- Calculate distance
    v_distance := calculate_haversine_distance(v_project_lat, v_project_lng, p_lat, p_lng);

    RETURN v_distance <= v_geo_radius;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_geofence IS 'Checks if GPS coordinates fall within a project''s geofence radius';

-- ---------------------------------------------------------------------------
-- Function: get_project_hours_summary
-- Returns total hours worked per employee on a project (from attendance logs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_project_hours_summary(p_project_id UUID)
RETURNS TABLE(
    employee_id UUID,
    employee_name TEXT,
    total_hours DECIMAL,
    total_days INTEGER,
    last_clock_in TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.employee_id,
        (e.first_name || ' ' || e.last_name)::TEXT AS employee_name,
        ROUND(SUM(
            EXTRACT(EPOCH FROM (al.time_out - al.time_in)) / 3600
        )::DECIMAL, 2) AS total_hours,
        COUNT(DISTINCT al.scheduled_shift_date)::INTEGER AS total_days,
        MAX(al.time_in) AS last_clock_in
    FROM project_assignments pa
    JOIN employees e ON e.id = pa.employee_id
    LEFT JOIN attendance_logs al ON al.employee_id = pa.employee_id
        AND al.time_in IS NOT NULL
        AND al.time_out IS NOT NULL
        AND al.scheduled_shift_date >= pa.assigned_date
        AND (pa.end_date IS NULL OR al.scheduled_shift_date <= pa.end_date)
    WHERE pa.project_id = p_project_id
    GROUP BY pa.employee_id, e.first_name, e.last_name
    ORDER BY total_hours DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_project_hours_summary IS 'Returns hours worked per employee on a project, aggregated from attendance logs';

-- ---------------------------------------------------------------------------
-- Function: get_project_status_summary
-- Returns project counts grouped by status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_project_status_summary()
RETURNS TABLE(status VARCHAR, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT p.status, COUNT(*)
    FROM projects p
    GROUP BY p.status
    ORDER BY
        CASE p.status
            WHEN 'Active' THEN 1
            WHEN 'Planning' THEN 2
            WHEN 'On Hold' THEN 3
            WHEN 'Completed' THEN 4
            WHEN 'Cancelled' THEN 5
        END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_project_status_summary IS 'Returns project counts grouped by status';

-- ---------------------------------------------------------------------------
-- Function: get_employee_active_projects
-- Returns all active project assignments for an employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_employee_active_projects(p_employee_id UUID)
RETURNS TABLE(
    project_id UUID,
    project_name VARCHAR,
    project_code VARCHAR,
    is_office BOOLEAN,
    assigned_date DATE,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.code,
        p.is_office,
        pa.assigned_date,
        p.status
    FROM project_assignments pa
    JOIN projects p ON p.id = pa.project_id
    WHERE pa.employee_id = p_employee_id
      AND pa.is_active = true
      AND p.status = 'Active'
    ORDER BY p.is_office DESC, p.name;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_employee_active_projects IS 'Returns all active project assignments for an employee (offices listed first)';

-- ---------------------------------------------------------------------------
-- Check constraint: Offices cannot have Completed or Cancelled status
-- Enforced via trigger since CHECK constraints can't reference other columns conditionally
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_project_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_office = true AND NEW.status IN ('Completed', 'Cancelled') THEN
        RAISE EXCEPTION 'Office locations cannot be set to Completed or Cancelled status';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_office_status
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION validate_project_status();
