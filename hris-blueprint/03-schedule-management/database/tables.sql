-- ============================================================================
-- Module 03: Schedule Management
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: schedule_templates
-- Description: Predefined shift schedule templates (e.g., Day Shift, Night Shift)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    shift_start     VARCHAR(10) NOT NULL,
    shift_end       VARCHAR(10) NOT NULL,
    work_days       VARCHAR(50) NOT NULL,
    break_minutes   INTEGER NOT NULL DEFAULT 60,
    is_night_shift  BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_templates_is_active ON schedule_templates(is_active);

COMMENT ON TABLE schedule_templates IS 'Predefined shift schedule templates assignable to employees';
COMMENT ON COLUMN schedule_templates.shift_start IS 'Time format HH:MM (e.g., 08:00)';
COMMENT ON COLUMN schedule_templates.shift_end IS 'Time format HH:MM (e.g., 17:00)';
COMMENT ON COLUMN schedule_templates.work_days IS 'Comma-separated day codes: Mon,Tue,Wed,Thu,Fri';
COMMENT ON COLUMN schedule_templates.break_minutes IS 'Total break/lunch time in minutes per shift';

-- ---------------------------------------------------------------------------
-- Table: employee_schedules
-- Description: Per-employee shift schedule assignments with effective dates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id         UUID REFERENCES schedule_templates(id) ON DELETE SET NULL,
    effective_date      DATE NOT NULL,
    end_date            DATE,
    shift_start         VARCHAR(10) NOT NULL,
    shift_end           VARCHAR(10) NOT NULL,
    work_days           VARCHAR(50) NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employee_schedules_employee_id ON employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_effective_date ON employee_schedules(effective_date);
CREATE INDEX idx_employee_schedules_is_active ON employee_schedules(is_active);
CREATE INDEX idx_employee_schedules_template_id ON employee_schedules(template_id);

COMMENT ON TABLE employee_schedules IS 'Per-employee shift schedule assignments with effective dates';
COMMENT ON COLUMN employee_schedules.effective_date IS 'Date from which this schedule takes effect';
COMMENT ON COLUMN employee_schedules.end_date IS 'Date when this schedule expires (NULL = indefinite)';
