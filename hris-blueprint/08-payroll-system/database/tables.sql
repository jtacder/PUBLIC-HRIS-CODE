-- ============================================================================
-- Module 08: Payroll System
-- File: tables.sql
-- ============================================================================
-- The payroll system is the financial backbone of the HRIS.
-- It synthesizes data from attendance, leave, loans, and HR settings
-- into accurate payroll computation and payslip generation.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: payroll_periods
-- Description: Defines payroll cutoff periods (semi-monthly or monthly)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_periods (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    cutoff_type         VARCHAR(20) NOT NULL DEFAULT 'semi_monthly'
                        CHECK (cutoff_type IN ('semi_monthly', 'monthly')),
    pay_date            DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'Open'
                        CHECK (status IN ('Open', 'Closed', 'Processing')),

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_payroll_period_dates CHECK (end_date >= start_date),
    CONSTRAINT uq_payroll_period_dates UNIQUE (start_date, end_date)
);

-- Indexes
CREATE INDEX idx_payroll_periods_dates ON payroll_periods(start_date, end_date);
CREATE INDEX idx_payroll_periods_status ON payroll_periods(status);

COMMENT ON TABLE payroll_periods IS 'Payroll cutoff period definitions (semi-monthly or monthly)';
COMMENT ON COLUMN payroll_periods.cutoff_type IS 'semi_monthly = 1st-15th and 16th-end; monthly = 1st-end';
COMMENT ON COLUMN payroll_periods.pay_date IS 'Scheduled pay date for this period';

-- ---------------------------------------------------------------------------
-- Table: payroll_records
-- Description: Individual employee payroll computation per period
-- Contains all earnings, deductions, and net pay with full breakdown
-- Status flow: DRAFT -> APPROVED -> RELEASED
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_records (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id                 UUID NOT NULL REFERENCES employees(id),
    payroll_period_id           UUID NOT NULL REFERENCES payroll_periods(id),

    -- Earnings
    basic_pay                   DECIMAL(10,2) NOT NULL DEFAULT 0,
    overtime_pay                DECIMAL(10,2) NOT NULL DEFAULT 0,
    holiday_pay                 DECIMAL(10,2) NOT NULL DEFAULT 0,
    allowances                  DECIMAL(10,2) NOT NULL DEFAULT 0,
    gross_pay                   DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Attendance data (inputs to computation)
    days_worked                 DECIMAL(5,2) NOT NULL DEFAULT 0,
    ot_minutes_regular          INTEGER NOT NULL DEFAULT 0,
    ot_minutes_rest_day         INTEGER NOT NULL DEFAULT 0,
    ot_minutes_holiday          INTEGER NOT NULL DEFAULT 0,
    late_minutes                INTEGER NOT NULL DEFAULT 0,
    absent_days                 DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Rate snapshot (captured at computation time)
    daily_rate                  DECIMAL(10,2) NOT NULL DEFAULT 0,
    hourly_rate                 DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Government deductions (semi-monthly share)
    sss_deduction               DECIMAL(10,2) NOT NULL DEFAULT 0,
    philhealth_deduction        DECIMAL(10,2) NOT NULL DEFAULT 0,
    pagibig_deduction           DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_deduction               DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Other deductions
    cash_advance_deduction      DECIMAL(10,2) NOT NULL DEFAULT 0,
    late_deduction              DECIMAL(10,2) NOT NULL DEFAULT 0,
    unpaid_leave_deduction      DECIMAL(10,2) NOT NULL DEFAULT 0,
    other_deductions            DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Totals
    total_deductions            DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_pay                     DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Workflow
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT', 'APPROVED', 'RELEASED')),
    approved_by                 UUID REFERENCES users(id),
    approved_at                 TIMESTAMP WITH TIME ZONE,
    released_by                 UUID REFERENCES users(id),
    released_at                 TIMESTAMP WITH TIME ZONE,

    -- Computation metadata
    computation_notes           TEXT,
    computed_at                 TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Timestamps
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- One payroll record per employee per period
    CONSTRAINT uq_payroll_employee_period UNIQUE (employee_id, payroll_period_id)
);

-- Indexes for common query patterns
CREATE INDEX idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX idx_payroll_records_period ON payroll_records(payroll_period_id);
CREATE INDEX idx_payroll_records_status ON payroll_records(status);
CREATE INDEX idx_payroll_records_employee_period ON payroll_records(employee_id, payroll_period_id);
CREATE INDEX idx_payroll_records_created_at ON payroll_records(created_at DESC);

COMMENT ON TABLE payroll_records IS 'Individual employee payroll computation per period with full earnings/deductions breakdown';
COMMENT ON COLUMN payroll_records.basic_pay IS 'Days Worked x Daily Rate';
COMMENT ON COLUMN payroll_records.overtime_pay IS 'Sum of all OT types: Regular(1.25x) + RestDay(1.30x) + Holiday(2.00x)';
COMMENT ON COLUMN payroll_records.gross_pay IS 'basic_pay + overtime_pay + holiday_pay + allowances';
COMMENT ON COLUMN payroll_records.sss_deduction IS 'SSS employee share (semi-monthly), bracket-based per RA 11199';
COMMENT ON COLUMN payroll_records.philhealth_deduction IS 'PhilHealth employee share (2.5% of basic, max P1,250/cutoff)';
COMMENT ON COLUMN payroll_records.pagibig_deduction IS 'Pag-IBIG employee share (1-2%, max P50/cutoff at P5,000 MSC)';
COMMENT ON COLUMN payroll_records.tax_deduction IS 'TRAIN Law withholding tax (semi-monthly, annualized computation)';
COMMENT ON COLUMN payroll_records.net_pay IS 'gross_pay - total_deductions';
COMMENT ON COLUMN payroll_records.daily_rate IS 'Snapshot of employee daily rate at computation time';
COMMENT ON COLUMN payroll_records.ot_minutes_regular IS 'Regular overtime minutes (1.25x multiplier)';
COMMENT ON COLUMN payroll_records.ot_minutes_rest_day IS 'Rest day overtime minutes (1.30x multiplier)';
COMMENT ON COLUMN payroll_records.ot_minutes_holiday IS 'Holiday overtime minutes (2.00x multiplier)';

-- ---------------------------------------------------------------------------
-- Table: payslips
-- Description: Generated payslip documents for employee viewing
-- Contains JSONB snapshot of all payroll data at time of generation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payslips (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_record_id   UUID NOT NULL REFERENCES payroll_records(id) ON DELETE CASCADE,
    employee_id         UUID NOT NULL REFERENCES employees(id),
    payslip_data        JSONB NOT NULL,
    generated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    viewed_at           TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- One payslip per payroll record
    CONSTRAINT uq_payslip_record UNIQUE (payroll_record_id)
);

-- Indexes
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_payroll_record ON payslips(payroll_record_id);
CREATE INDEX idx_payslips_generated_at ON payslips(generated_at DESC);

COMMENT ON TABLE payslips IS 'Generated payslip documents with JSONB snapshot of full payroll computation';
COMMENT ON COLUMN payslips.payslip_data IS 'JSONB snapshot: employee info, earnings breakdown, deductions breakdown, net pay, period details';
COMMENT ON COLUMN payslips.viewed_at IS 'Timestamp when employee first viewed the payslip';

-- ---------------------------------------------------------------------------
-- Table: sss_contribution_table
-- Description: SSS contribution bracket lookup table per RA 11199 (2024)
-- Used by payroll calculator to determine employee/employer shares
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sss_contribution_table (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salary_range_from       DECIMAL(10,2) NOT NULL,
    salary_range_to         DECIMAL(10,2) NOT NULL,
    monthly_salary_credit   DECIMAL(10,2) NOT NULL,
    total_contribution      DECIMAL(10,2) NOT NULL,
    employee_share          DECIMAL(10,2) NOT NULL,
    employer_share          DECIMAL(10,2) NOT NULL,
    ec_contribution         DECIMAL(10,2) NOT NULL DEFAULT 0,
    effective_date          DATE NOT NULL DEFAULT '2024-01-01',
    is_active               BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for bracket lookup
CREATE INDEX idx_sss_table_range ON sss_contribution_table(salary_range_from, salary_range_to);
CREATE INDEX idx_sss_table_active ON sss_contribution_table(is_active, effective_date);

COMMENT ON TABLE sss_contribution_table IS 'SSS contribution bracket lookup table per RA 11199 (57 salary brackets)';
COMMENT ON COLUMN sss_contribution_table.monthly_salary_credit IS 'MSC used as basis for contribution computation';
COMMENT ON COLUMN sss_contribution_table.employee_share IS 'Monthly employee share (divide by 2 for semi-monthly)';
