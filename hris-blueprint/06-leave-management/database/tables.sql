-- ============================================================================
-- Module 06: Leave Management
-- File: tables.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: leave_types
-- Description: Configurable leave categories with annual allocation and
--              accrual mode (annual = full on Day 1, monthly = gradual)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_types (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL UNIQUE,
    days_per_year       INTEGER NOT NULL DEFAULT 0,
    is_paid             BOOLEAN NOT NULL DEFAULT true,
    accrual_mode        VARCHAR(20) NOT NULL DEFAULT 'annual'
                        CHECK (accrual_mode IN ('annual', 'monthly')),
    requires_attachment BOOLEAN NOT NULL DEFAULT false,
    min_days_notice     INTEGER DEFAULT 0,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE leave_types IS 'Leave type definitions with annual allocations and accrual modes';
COMMENT ON COLUMN leave_types.accrual_mode IS 'annual = full allocation on Jan 1; monthly = (days_per_year/12) * completed months';
COMMENT ON COLUMN leave_types.requires_attachment IS 'Whether a supporting document is required (e.g., medical certificate for sick leave)';
COMMENT ON COLUMN leave_types.min_days_notice IS 'Minimum days of advance notice required (0 = no restriction)';

-- ---------------------------------------------------------------------------
-- Table: leave_requests
-- Description: Individual leave request records with approval workflow
-- Status flow: Pending -> Approved | Rejected | Cancelled
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    leave_type_id       UUID NOT NULL REFERENCES leave_types(id),
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    days_count          DECIMAL(5,2) NOT NULL,
    reason              TEXT,
    attachment_url      TEXT,

    -- Workflow
    status              VARCHAR(20) NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMP WITH TIME ZONE,
    rejection_reason    TEXT,
    cancelled_at        TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_leave_days_positive CHECK (days_count > 0)
);

-- Indexes for common query patterns
CREATE INDEX idx_leave_request_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_request_status ON leave_requests(status);
CREATE INDEX idx_leave_request_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_request_employee_status ON leave_requests(employee_id, status);
CREATE INDEX idx_leave_request_leave_type ON leave_requests(leave_type_id);
CREATE INDEX idx_leave_request_created_at ON leave_requests(created_at DESC);

COMMENT ON TABLE leave_requests IS 'Leave requests with status workflow: Pending -> Approved/Rejected/Cancelled';
COMMENT ON COLUMN leave_requests.days_count IS 'Number of leave days (supports half-days as 0.5)';
COMMENT ON COLUMN leave_requests.approved_by IS 'User ID of the HR/Admin who approved or rejected the request';
COMMENT ON COLUMN leave_requests.rejection_reason IS 'Required explanation when HR/Admin rejects a leave request';

-- ---------------------------------------------------------------------------
-- Table: leave_allocations
-- Description: Per-employee, per-leave-type, per-year balance tracking
-- Unique constraint ensures one allocation row per (employee, type, year)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leave_allocations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    leave_type_id       UUID NOT NULL REFERENCES leave_types(id),
    year                INTEGER NOT NULL,
    total_days          DECIMAL(5,2) NOT NULL DEFAULT 0,
    used_days           DECIMAL(5,2) NOT NULL DEFAULT 0,
    remaining_days      DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- One allocation per employee per leave type per year
    CONSTRAINT uq_leave_allocation UNIQUE(employee_id, leave_type_id, year),
    CONSTRAINT chk_used_days_non_negative CHECK (used_days >= 0),
    CONSTRAINT chk_remaining_days_non_negative CHECK (remaining_days >= 0)
);

-- Indexes
CREATE INDEX idx_leave_allocation_employee ON leave_allocations(employee_id);
CREATE INDEX idx_leave_allocation_year ON leave_allocations(year);
CREATE INDEX idx_leave_allocation_type_year ON leave_allocations(leave_type_id, year);

COMMENT ON TABLE leave_allocations IS 'Per-employee leave balance tracking by type and year';
COMMENT ON COLUMN leave_allocations.total_days IS 'Total allocated days for the year (may be pro-rated for monthly accrual)';
COMMENT ON COLUMN leave_allocations.used_days IS 'Days consumed by approved leave requests';
COMMENT ON COLUMN leave_allocations.remaining_days IS 'Computed: total_days - used_days';

-- ---------------------------------------------------------------------------
-- Seed data: Default Philippine leave types
-- ---------------------------------------------------------------------------
INSERT INTO leave_types (name, days_per_year, is_paid, accrual_mode, description) VALUES
    ('Sick Leave', 15, true, 'annual', 'Medical-related absences. Medical certificate required for 3+ consecutive days.'),
    ('Vacation Leave', 15, true, 'monthly', 'Planned time off. Requires advance request and supervisor approval.'),
    ('Bereavement Leave', 3, true, 'annual', 'Death of immediate family member (spouse, child, parent, sibling).'),
    ('Maternity Leave', 105, true, 'annual', 'RA 11210 Expanded Maternity Leave. 105 days for live birth, +30 for solo parents.'),
    ('Paternity Leave', 7, true, 'annual', 'RA 8187 Paternity Leave for married male employees. 7 days per delivery.'),
    ('Emergency Leave', 3, true, 'annual', 'Unforeseen emergencies requiring immediate absence from work.')
ON CONFLICT (name) DO NOTHING;
