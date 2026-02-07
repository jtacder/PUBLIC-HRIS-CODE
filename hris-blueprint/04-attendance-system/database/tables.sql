-- ============================================================================
-- Module 04: Attendance System
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: attendance_logs
-- Description: Daily time-in/time-out records with GPS and photo verification
-- This is one of the most critical tables - used by payroll computation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id              UUID REFERENCES projects(id) ON DELETE SET NULL,
    time_in                 TIMESTAMP WITH TIME ZONE,
    time_out                TIMESTAMP WITH TIME ZONE,

    -- GPS verification (time-in)
    gps_latitude            DECIMAL(10,7),
    gps_longitude           DECIMAL(10,7),
    gps_accuracy            DECIMAL(10,2),

    -- GPS verification (time-out)
    gps_latitude_out        DECIMAL(10,7),
    gps_longitude_out       DECIMAL(10,7),

    -- Photo verification
    photo_snapshot_url      TEXT,
    photo_snapshot_url_out  TEXT,

    -- Verification
    verification_status     VARCHAR(30) DEFAULT 'Pending'
                            CHECK (verification_status IN ('Verified', 'Off-site', 'Pending', 'Flagged')),
    face_verified           BOOLEAN NOT NULL DEFAULT false,

    -- Lateness tracking
    late_minutes            INTEGER NOT NULL DEFAULT 0,
    late_deductible         BOOLEAN NOT NULL DEFAULT false,

    -- Overtime tracking
    overtime_minutes        INTEGER NOT NULL DEFAULT 0,
    ot_status               VARCHAR(20) DEFAULT 'Pending'
                            CHECK (ot_status IN ('Pending', 'Approved', 'Rejected')),
    is_overtime_session     BOOLEAN NOT NULL DEFAULT false,

    -- Shift information
    scheduled_shift_date    DATE,
    actual_shift_type       VARCHAR(10) DEFAULT 'day'
                            CHECK (actual_shift_type IN ('day', 'night')),

    -- Working time computation
    lunch_deduction_minutes INTEGER NOT NULL DEFAULT 0,
    total_working_minutes   INTEGER NOT NULL DEFAULT 0,

    -- Notes and justifications
    justification           TEXT,
    admin_notes             TEXT,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Primary query indexes
CREATE INDEX idx_attendance_logs_employee_id ON attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_project_id ON attendance_logs(project_id);
CREATE INDEX idx_attendance_logs_time_in ON attendance_logs(time_in);
CREATE INDEX idx_attendance_logs_scheduled_shift_date ON attendance_logs(scheduled_shift_date);
CREATE INDEX idx_attendance_logs_verification_status ON attendance_logs(verification_status);
CREATE INDEX idx_attendance_logs_ot_status ON attendance_logs(ot_status);

-- Composite indexes for common queries
CREATE INDEX idx_attendance_logs_employee_date ON attendance_logs(employee_id, scheduled_shift_date);
CREATE INDEX idx_attendance_logs_date_range ON attendance_logs(scheduled_shift_date, employee_id);

COMMENT ON TABLE attendance_logs IS 'Time-in/time-out records with GPS geofence and photo verification';
COMMENT ON COLUMN attendance_logs.verification_status IS 'Verified=within geofence, Off-site=outside geofence, Flagged=needs review';
COMMENT ON COLUMN attendance_logs.late_deductible IS 'Whether lateness triggers a payroll deduction (grace period may apply)';
COMMENT ON COLUMN attendance_logs.total_working_minutes IS 'Computed: (time_out - time_in) - lunch_deduction_minutes';
COMMENT ON COLUMN attendance_logs.is_overtime_session IS 'Separate OT session outside normal shift';

-- ---------------------------------------------------------------------------
-- Table: attendance_verifications
-- Description: Admin/HR verification audit trail for attendance entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_verifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_log_id   UUID NOT NULL REFERENCES attendance_logs(id) ON DELETE CASCADE,
    status              VARCHAR(30) NOT NULL,
    verified_by         UUID NOT NULL REFERENCES users(id),
    notes               TEXT,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_verifications_log_id ON attendance_verifications(attendance_log_id);
CREATE INDEX idx_attendance_verifications_verified_by ON attendance_verifications(verified_by);

COMMENT ON TABLE attendance_verifications IS 'Verification audit trail - each status change creates a new record';
