-- ============================================================================
-- Module 11: Devotional System
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: devotionals
-- Description: Daily devotional content entries with scripture references
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devotionals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(255) NOT NULL,
    content             TEXT NOT NULL,
    scripture_reference VARCHAR(255),
    date                DATE NOT NULL,
    author              VARCHAR(200),

    -- Creator tracking
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Deprecated: Yearly theme feature (schema preserved, not used in UI/API)
    -- theme            VARCHAR(255),
    -- year             INTEGER,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_devotionals_date ON devotionals(date);
CREATE INDEX idx_devotionals_created_by ON devotionals(created_by);
CREATE INDEX idx_devotionals_created_at ON devotionals(created_at DESC);

COMMENT ON TABLE devotionals IS 'Daily devotional content entries for employee spiritual wellness';
COMMENT ON COLUMN devotionals.title IS 'Title of the devotional reading';
COMMENT ON COLUMN devotionals.content IS 'Full devotional text content';
COMMENT ON COLUMN devotionals.scripture_reference IS 'Bible verse reference (e.g., John 3:16, Psalm 23:1-6)';
COMMENT ON COLUMN devotionals.date IS 'Date the devotional is scheduled for display';
COMMENT ON COLUMN devotionals.author IS 'Name of the devotional author or contributor';
COMMENT ON COLUMN devotionals.created_by IS 'FK to users -- the admin who created this entry';

-- ---------------------------------------------------------------------------
-- Table: devotional_reading_logs
-- Description: Tracks which employees have read which devotionals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devotional_reading_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devotional_id       UUID NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    read_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Prevent duplicate reads
    CONSTRAINT uq_devotional_employee UNIQUE (devotional_id, employee_id)
);

-- Indexes for common query patterns
CREATE INDEX idx_devotional_reading_logs_devotional ON devotional_reading_logs(devotional_id);
CREATE INDEX idx_devotional_reading_logs_employee ON devotional_reading_logs(employee_id);
CREATE INDEX idx_devotional_reading_logs_read_at ON devotional_reading_logs(read_at DESC);

COMMENT ON TABLE devotional_reading_logs IS 'Tracks employee engagement with devotional readings';
COMMENT ON COLUMN devotional_reading_logs.devotional_id IS 'FK to devotionals -- the devotional that was read';
COMMENT ON COLUMN devotional_reading_logs.employee_id IS 'FK to employees -- the employee who read it';
COMMENT ON COLUMN devotional_reading_logs.read_at IS 'Timestamp when the employee marked the devotional as read';
