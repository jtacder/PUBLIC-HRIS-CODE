-- ============================================================================
-- Module 09: Disciplinary
-- File: tables.sql
-- ============================================================================
-- Implements the Philippine twin-notice rule for employee discipline:
-- 1. NTE (Notice to Explain) - issued by HR/Admin
-- 2. Employee explanation - submitted within 5-day deadline
-- 3. Resolution - HR/Admin decision with sanction
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: disciplinary_records
-- Description: NTE records tracking the full disciplinary workflow
-- Status flow: Issued -> Explanation_Received -> Resolved
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinary_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id),

    -- Violation details
    violation               VARCHAR(200) NOT NULL,
    violation_category      VARCHAR(50) NOT NULL DEFAULT 'Others'
                            CHECK (violation_category IN (
                                'Attendance', 'Conduct', 'Performance',
                                'Policy', 'Safety', 'Integrity', 'Others'
                            )),
    violation_date          DATE NOT NULL,
    description             TEXT NOT NULL,
    supporting_document_url TEXT,

    -- NTE workflow
    status                  VARCHAR(30) NOT NULL DEFAULT 'Issued'
                            CHECK (status IN ('Issued', 'Explanation_Received', 'Resolved')),
    response_deadline       DATE NOT NULL,

    -- Issuance
    issued_by               UUID NOT NULL REFERENCES users(id),
    issued_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Resolution
    sanction                VARCHAR(30)
                            CHECK (sanction IS NULL OR sanction IN (
                                'verbal_warning', 'written_warning', 'suspension', 'termination'
                            )),
    resolution_notes        TEXT,
    resolved_by             UUID REFERENCES users(id),
    resolved_at             TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_disciplinary_employee ON disciplinary_records(employee_id);
CREATE INDEX idx_disciplinary_status ON disciplinary_records(status);
CREATE INDEX idx_disciplinary_violation_category ON disciplinary_records(violation_category);
CREATE INDEX idx_disciplinary_violation_date ON disciplinary_records(violation_date);
CREATE INDEX idx_disciplinary_response_deadline ON disciplinary_records(response_deadline);
CREATE INDEX idx_disciplinary_employee_status ON disciplinary_records(employee_id, status);
CREATE INDEX idx_disciplinary_created_at ON disciplinary_records(created_at DESC);

COMMENT ON TABLE disciplinary_records IS 'NTE (Notice to Explain) records for employee discipline with twin-notice workflow';
COMMENT ON COLUMN disciplinary_records.violation IS 'Short description of the alleged violation';
COMMENT ON COLUMN disciplinary_records.violation_category IS 'Category: Attendance, Conduct, Performance, Policy, Safety, Integrity, Others';
COMMENT ON COLUMN disciplinary_records.response_deadline IS 'Deadline for employee to submit explanation (typically issue_date + 5 days)';
COMMENT ON COLUMN disciplinary_records.sanction IS 'Disciplinary action: verbal_warning, written_warning, suspension, termination';

-- ---------------------------------------------------------------------------
-- Table: disciplinary_explanations
-- Description: Employee-submitted explanations in response to NTEs
-- An employee may submit one explanation per NTE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinary_explanations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplinary_record_id      UUID NOT NULL REFERENCES disciplinary_records(id) ON DELETE CASCADE,
    explanation_text            TEXT NOT NULL,
    attachment_url              TEXT,
    is_late                     BOOLEAN NOT NULL DEFAULT false,
    submitted_by                UUID NOT NULL REFERENCES users(id),
    submitted_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- One explanation per disciplinary record
    CONSTRAINT uq_disciplinary_explanation UNIQUE (disciplinary_record_id)
);

-- Indexes
CREATE INDEX idx_disciplinary_explanations_record ON disciplinary_explanations(disciplinary_record_id);

COMMENT ON TABLE disciplinary_explanations IS 'Employee explanations submitted in response to NTEs';
COMMENT ON COLUMN disciplinary_explanations.is_late IS 'True if explanation was submitted after the response_deadline';
COMMENT ON COLUMN disciplinary_explanations.submitted_by IS 'User ID of the employee who submitted the explanation';

-- ---------------------------------------------------------------------------
-- Table: disciplinary_sanctions
-- Description: Formal sanction records with effective dates
-- For suspensions, tracks start and end dates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplinary_sanctions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disciplinary_record_id      UUID NOT NULL REFERENCES disciplinary_records(id) ON DELETE CASCADE,
    sanction_type               VARCHAR(30) NOT NULL
                                CHECK (sanction_type IN (
                                    'verbal_warning', 'written_warning', 'suspension', 'termination'
                                )),
    effective_date              DATE NOT NULL,
    end_date                    DATE,
    suspension_days             INTEGER,
    notes                       TEXT,
    imposed_by                  UUID NOT NULL REFERENCES users(id),
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- One formal sanction per disciplinary record
    CONSTRAINT uq_disciplinary_sanction UNIQUE (disciplinary_record_id)
);

-- Indexes
CREATE INDEX idx_disciplinary_sanctions_record ON disciplinary_sanctions(disciplinary_record_id);
CREATE INDEX idx_disciplinary_sanctions_type ON disciplinary_sanctions(sanction_type);
CREATE INDEX idx_disciplinary_sanctions_effective ON disciplinary_sanctions(effective_date);

COMMENT ON TABLE disciplinary_sanctions IS 'Formal sanction records imposed as a result of disciplinary proceedings';
COMMENT ON COLUMN disciplinary_sanctions.suspension_days IS 'Number of suspension days (only applicable for suspension sanction type)';
COMMENT ON COLUMN disciplinary_sanctions.end_date IS 'End date of suspension (NULL for warnings; separation date for termination)';
