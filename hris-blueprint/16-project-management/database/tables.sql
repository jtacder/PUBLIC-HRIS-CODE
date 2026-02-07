-- ============================================================================
-- Module 16: Project Management
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: projects
-- Description: Project and office location definitions with geofence support
-- is_office=true: Permanent office location (no deadline, no completion)
-- is_office=false: Time-bound project with deadline and budget
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    code                VARCHAR(50) NOT NULL UNIQUE,
    description         TEXT,

    -- Office vs Project distinction
    is_office           BOOLEAN NOT NULL DEFAULT false,

    -- Geofencing
    location_lat        DECIMAL(10, 7),
    location_lng        DECIMAL(10, 7),
    geo_radius          INTEGER NOT NULL DEFAULT 100,

    -- Timeline (projects only; NULL for offices)
    start_date          DATE,
    deadline            DATE,

    -- Budget tracking (projects only)
    budget              DECIMAL(15, 2) DEFAULT 0,
    actual_cost         DECIMAL(15, 2) DEFAULT 0,

    -- Status workflow
    status              VARCHAR(30) NOT NULL DEFAULT 'Planning'
                        CHECK (status IN ('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled')),

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_is_office ON projects(is_office);
CREATE INDEX idx_projects_geofence ON projects(location_lat, location_lng)
    WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

COMMENT ON TABLE projects IS 'Project and office location definitions with geofence coordinates';
COMMENT ON COLUMN projects.code IS 'Unique short code (e.g., PROJ-001, OFC-MAIN)';
COMMENT ON COLUMN projects.is_office IS 'true = permanent office location, false = time-bound project';
COMMENT ON COLUMN projects.location_lat IS 'Latitude of geofence center point (WGS84)';
COMMENT ON COLUMN projects.location_lng IS 'Longitude of geofence center point (WGS84)';
COMMENT ON COLUMN projects.geo_radius IS 'Geofence radius in meters (default: 100m)';
COMMENT ON COLUMN projects.status IS 'Planning, Active, On Hold, Completed, Cancelled';
COMMENT ON COLUMN projects.budget IS 'Planned budget in PHP (projects only)';
COMMENT ON COLUMN projects.actual_cost IS 'Actual cost incurred in PHP (manually updated)';

-- ---------------------------------------------------------------------------
-- Table: project_assignments
-- Description: Employee-to-project assignment tracking with date ranges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_assignments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Assignment period
    assigned_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date            DATE,

    -- Active status (false = historical/completed assignment)
    is_active           BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX idx_project_assignments_employee_id ON project_assignments(employee_id);
CREATE INDEX idx_project_assignments_active ON project_assignments(project_id, is_active)
    WHERE is_active = true;
CREATE INDEX idx_project_assignments_employee_active ON project_assignments(employee_id, is_active)
    WHERE is_active = true;

COMMENT ON TABLE project_assignments IS 'Tracks which employees are assigned to which projects with date ranges';
COMMENT ON COLUMN project_assignments.assigned_date IS 'Date the employee was assigned to the project';
COMMENT ON COLUMN project_assignments.end_date IS 'Date the assignment ended (NULL if still active)';
COMMENT ON COLUMN project_assignments.is_active IS 'true = currently assigned, false = assignment ended';
