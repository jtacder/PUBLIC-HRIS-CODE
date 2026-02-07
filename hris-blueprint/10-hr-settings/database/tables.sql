-- ============================================================================
-- Module 10: HR Settings
-- File: tables.sql
-- ============================================================================
-- System configuration tables for payroll cutoffs, holidays, and company info.
-- Leave types and payroll periods are shared with modules 06 and 08
-- respectively -- their CREATE TABLE statements are in those modules.
-- This module owns the holidays and company_settings tables.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: holidays
-- Description: Regular and special non-working holidays for payroll and
--              attendance computation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holidays (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    date                DATE NOT NULL,
    type                VARCHAR(50) NOT NULL
                        CHECK (type IN ('Regular', 'Special_Non_Working')),
    is_recurring        BOOLEAN NOT NULL DEFAULT false,
    year                INTEGER NOT NULL,
    description         TEXT,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Prevent duplicate holidays on the same date
    CONSTRAINT uq_holiday_date UNIQUE (date)
);

-- Indexes
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_year ON holidays(year);
CREATE INDEX idx_holidays_type ON holidays(type);
CREATE INDEX idx_holidays_recurring ON holidays(is_recurring);

COMMENT ON TABLE holidays IS 'Regular and special non-working holidays for payroll/attendance computation';
COMMENT ON COLUMN holidays.type IS 'Regular = 200% pay for work; Special_Non_Working = 130% pay for work';
COMMENT ON COLUMN holidays.is_recurring IS 'If true, holiday repeats annually on the same month/day';
COMMENT ON COLUMN holidays.year IS 'Year the holiday applies to (for non-recurring and year-specific listings)';

-- ---------------------------------------------------------------------------
-- Table: company_settings
-- Description: Singleton table for company-wide configuration
-- Only one row should exist (enforced by application layer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Company information (used in payslip headers, reports)
    company_name                VARCHAR(200) NOT NULL DEFAULT 'Company Name',
    company_address             TEXT,
    company_phone               VARCHAR(50),
    company_email               VARCHAR(255),
    company_website             VARCHAR(255),
    company_tin                 VARCHAR(20),
    logo_url                    TEXT,

    -- Government registration numbers (employer accounts)
    sss_employer_no             VARCHAR(20),
    philhealth_employer_no      VARCHAR(20),
    pagibig_employer_no         VARCHAR(20),

    -- Payroll configuration
    standard_working_days       INTEGER NOT NULL DEFAULT 22,
    standard_working_hours      DECIMAL(4,2) NOT NULL DEFAULT 8.00,
    overtime_regular_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.25,
    overtime_rest_day_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.30,
    overtime_holiday_multiplier DECIMAL(4,2) NOT NULL DEFAULT 2.00,
    late_deduction_per_minute   DECIMAL(8,4) DEFAULT 0,
    grace_period_minutes        INTEGER NOT NULL DEFAULT 0,

    -- Leave defaults
    default_sick_leave_days     INTEGER NOT NULL DEFAULT 15,
    default_vacation_leave_days INTEGER NOT NULL DEFAULT 15,

    -- Timestamps
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE company_settings IS 'Singleton company-wide configuration for payslip headers, payroll parameters, and employer government numbers';
COMMENT ON COLUMN company_settings.standard_working_days IS 'Working days per month for monthly-to-daily rate conversion (default 22)';
COMMENT ON COLUMN company_settings.standard_working_hours IS 'Standard working hours per day for hourly rate calculation (default 8)';
COMMENT ON COLUMN company_settings.overtime_regular_multiplier IS 'OT multiplier for regular working days (default 1.25x)';
COMMENT ON COLUMN company_settings.overtime_rest_day_multiplier IS 'OT multiplier for rest days (default 1.30x)';
COMMENT ON COLUMN company_settings.overtime_holiday_multiplier IS 'OT multiplier for holidays (default 2.00x)';
COMMENT ON COLUMN company_settings.grace_period_minutes IS 'Grace period in minutes before tardiness is recorded (default 0)';

-- ---------------------------------------------------------------------------
-- Seed data: Default company settings (singleton row)
-- ---------------------------------------------------------------------------
INSERT INTO company_settings (company_name)
VALUES ('My Company')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed data: Philippine regular holidays (2025)
-- ---------------------------------------------------------------------------
INSERT INTO holidays (name, date, type, is_recurring, year) VALUES
    ('New Year''s Day', '2025-01-01', 'Regular', true, 2025),
    ('Araw ng Kagitingan', '2025-04-09', 'Regular', true, 2025),
    ('Maundy Thursday', '2025-04-17', 'Regular', false, 2025),
    ('Good Friday', '2025-04-18', 'Regular', false, 2025),
    ('Labor Day', '2025-05-01', 'Regular', true, 2025),
    ('Independence Day', '2025-06-12', 'Regular', true, 2025),
    ('National Heroes Day', '2025-08-25', 'Regular', false, 2025),
    ('Bonifacio Day', '2025-11-30', 'Regular', true, 2025),
    ('Christmas Day', '2025-12-25', 'Regular', true, 2025),
    ('Rizal Day', '2025-12-30', 'Regular', true, 2025)
ON CONFLICT (date) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed data: Philippine special non-working holidays (2025)
-- ---------------------------------------------------------------------------
INSERT INTO holidays (name, date, type, is_recurring, year) VALUES
    ('EDSA People Power Revolution Anniversary', '2025-02-25', 'Special_Non_Working', true, 2025),
    ('Black Saturday', '2025-04-19', 'Special_Non_Working', false, 2025),
    ('Ninoy Aquino Day', '2025-08-21', 'Special_Non_Working', true, 2025),
    ('All Saints'' Day', '2025-11-01', 'Special_Non_Working', true, 2025),
    ('All Souls'' Day', '2025-11-02', 'Special_Non_Working', false, 2025),
    ('Christmas Eve', '2025-12-24', 'Special_Non_Working', true, 2025),
    ('Last Day of the Year', '2025-12-31', 'Special_Non_Working', true, 2025)
ON CONFLICT (date) DO NOTHING;
