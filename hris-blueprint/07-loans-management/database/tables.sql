-- ============================================================================
-- Module 07: Loans Management (Cash Advances)
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: cash_advances
-- Description: Employee cash advance requests with approval workflow
--              and automatic payroll deduction tracking
-- Status flow: Pending -> Approved -> Disbursed -> Fully_Paid (or Rejected)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_advances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees(id),
    amount                  DECIMAL(10,2) NOT NULL,
    purpose                 TEXT,
    deduction_per_cutoff    DECIMAL(10,2) NOT NULL,
    remaining_balance       DECIMAL(10,2) NOT NULL,

    -- Workflow
    status                  VARCHAR(20) NOT NULL DEFAULT 'Pending'
                            CHECK (status IN ('Pending', 'Approved', 'Disbursed', 'Rejected', 'Fully_Paid')),
    approved_by             UUID REFERENCES users(id),
    approved_at             TIMESTAMP WITH TIME ZONE,
    disbursed_at            TIMESTAMP WITH TIME ZONE,
    rejection_reason        TEXT,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_cash_advance_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_cash_advance_deduction_positive CHECK (deduction_per_cutoff > 0),
    CONSTRAINT chk_cash_advance_deduction_cap CHECK (deduction_per_cutoff <= amount),
    CONSTRAINT chk_cash_advance_balance_non_negative CHECK (remaining_balance >= 0)
);

-- Indexes for common query patterns
CREATE INDEX idx_cash_advance_employee ON cash_advances(employee_id);
CREATE INDEX idx_cash_advance_status ON cash_advances(status);
CREATE INDEX idx_cash_advance_employee_status ON cash_advances(employee_id, status);
CREATE INDEX idx_cash_advance_created_at ON cash_advances(created_at DESC);

COMMENT ON TABLE cash_advances IS 'Cash advance requests with multi-step approval workflow and payroll deduction tracking';
COMMENT ON COLUMN cash_advances.amount IS 'Total cash advance amount requested';
COMMENT ON COLUMN cash_advances.deduction_per_cutoff IS 'Fixed amount deducted from each payroll cutoff until fully paid';
COMMENT ON COLUMN cash_advances.remaining_balance IS 'Outstanding balance; set to amount on disbursement, decremented by payroll deductions';
COMMENT ON COLUMN cash_advances.status IS 'Pending -> Approved -> Disbursed -> Fully_Paid, or Rejected';

-- ---------------------------------------------------------------------------
-- Table: cash_advance_deductions
-- Description: Audit trail of every payroll deduction applied to a cash advance
--              Links cash advances to specific payroll records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_advance_deductions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_advance_id         UUID NOT NULL REFERENCES cash_advances(id),
    payroll_record_id       UUID REFERENCES payroll_records(id),
    amount                  DECIMAL(10,2) NOT NULL,
    deduction_date          DATE NOT NULL,

    -- Timestamps
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_deduction_amount_positive CHECK (amount > 0)
);

-- Indexes
CREATE INDEX idx_cash_advance_deductions_advance ON cash_advance_deductions(cash_advance_id);
CREATE INDEX idx_cash_advance_deductions_payroll ON cash_advance_deductions(payroll_record_id);
CREATE INDEX idx_cash_advance_deductions_date ON cash_advance_deductions(deduction_date);

COMMENT ON TABLE cash_advance_deductions IS 'Audit trail of payroll deductions applied to cash advances';
COMMENT ON COLUMN cash_advance_deductions.payroll_record_id IS 'Reference to the payroll record that triggered this deduction';
COMMENT ON COLUMN cash_advance_deductions.deduction_date IS 'Date the deduction was applied (payroll cutoff date)';
