-- ============================================================================
-- Module 08: Payroll System
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on payroll_periods
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_payroll_periods_updated_at
    BEFORE UPDATE ON payroll_periods
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on payroll_records
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_payroll_records_updated_at
    BEFORE UPDATE ON payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger Function: Compute net_pay and total_deductions before save
-- Ensures net_pay is always consistent with earnings and deductions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_payroll_compute_net_pay()
RETURNS TRIGGER AS $$
BEGIN
    -- Compute gross pay
    NEW.gross_pay := NEW.basic_pay + NEW.overtime_pay + NEW.holiday_pay + NEW.allowances;

    -- Compute total deductions
    NEW.total_deductions := NEW.sss_deduction
                          + NEW.philhealth_deduction
                          + NEW.pagibig_deduction
                          + NEW.tax_deduction
                          + NEW.cash_advance_deduction
                          + NEW.late_deduction
                          + NEW.unpaid_leave_deduction
                          + NEW.other_deductions;

    -- Compute net pay
    NEW.net_pay := NEW.gross_pay - NEW.total_deductions;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payroll_record_compute
    BEFORE INSERT OR UPDATE ON payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_payroll_compute_net_pay();

-- ---------------------------------------------------------------------------
-- Trigger Function: Validate payroll status transitions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_payroll_status_validation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT', 'APPROVED') THEN
        RAISE EXCEPTION 'Invalid payroll transition from DRAFT to %. Allowed: APPROVED', NEW.status;
    END IF;

    IF OLD.status = 'APPROVED' AND NEW.status NOT IN ('APPROVED', 'RELEASED') THEN
        RAISE EXCEPTION 'Invalid payroll transition from APPROVED to %. Allowed: RELEASED', NEW.status;
    END IF;

    IF OLD.status = 'RELEASED' THEN
        RAISE EXCEPTION 'Cannot modify a RELEASED payroll record. This is a terminal state.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payroll_validate_status
    BEFORE UPDATE ON payroll_records
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trigger_payroll_status_validation();

-- ---------------------------------------------------------------------------
-- Trigger Function: Prevent modification of non-DRAFT payroll records
-- (except for status transitions)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_payroll_lock_approved()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow status transitions (handled by status validation trigger)
    IF OLD.status != 'DRAFT' AND OLD.status = NEW.status THEN
        RAISE EXCEPTION 'Cannot modify payroll record in % status. Only DRAFT records can be edited.', OLD.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payroll_lock_non_draft
    BEFORE UPDATE ON payroll_records
    FOR EACH ROW
    WHEN (OLD.status != 'DRAFT')
    EXECUTE FUNCTION trigger_payroll_lock_approved();

-- ---------------------------------------------------------------------------
-- Function: lookup_sss_contribution
-- Looks up the SSS employee share for a given monthly salary
-- Returns the semi-monthly employee share (monthly share / 2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lookup_sss_contribution(p_monthly_salary DECIMAL(10,2))
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_employee_share DECIMAL(10,2);
BEGIN
    SELECT employee_share / 2 INTO v_employee_share
    FROM sss_contribution_table
    WHERE p_monthly_salary >= salary_range_from
      AND p_monthly_salary <= salary_range_to
      AND is_active = true
    ORDER BY salary_range_from DESC
    LIMIT 1;

    -- If salary exceeds all brackets, use the maximum
    IF v_employee_share IS NULL THEN
        SELECT employee_share / 2 INTO v_employee_share
        FROM sss_contribution_table
        WHERE is_active = true
        ORDER BY salary_range_to DESC
        LIMIT 1;
    END IF;

    RETURN COALESCE(v_employee_share, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION lookup_sss_contribution IS 'Returns semi-monthly SSS employee share for a given monthly salary using bracket lookup';

-- ---------------------------------------------------------------------------
-- Function: compute_philhealth_contribution
-- Computes PhilHealth semi-monthly employee share
-- 5% of basic salary (2.5% employee share), floor P10,000, ceiling P100,000
-- Max semi-monthly employee share: P1,250
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_philhealth_contribution(p_monthly_salary DECIMAL(10,2))
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_base DECIMAL(10,2);
    v_monthly_share DECIMAL(10,2);
BEGIN
    -- Apply floor and ceiling
    v_base := GREATEST(p_monthly_salary, 10000);
    v_base := LEAST(v_base, 100000);

    -- 5% total, 2.5% employee share
    v_monthly_share := ROUND(v_base * 0.025, 2);

    -- Semi-monthly
    RETURN ROUND(v_monthly_share / 2, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION compute_philhealth_contribution IS 'Returns semi-monthly PhilHealth employee share (2.5% of basic, floor P10K, ceiling P100K)';

-- ---------------------------------------------------------------------------
-- Function: compute_pagibig_contribution
-- Computes Pag-IBIG semi-monthly employee share
-- Salary <= P1,500: 1%; > P1,500: 2% (MSC cap P5,000)
-- Max semi-monthly: P50
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_pagibig_contribution(p_monthly_salary DECIMAL(10,2))
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_rate DECIMAL(4,3);
    v_base DECIMAL(10,2);
    v_monthly_share DECIMAL(10,2);
BEGIN
    -- Determine rate
    IF p_monthly_salary <= 1500 THEN
        v_rate := 0.01;
    ELSE
        v_rate := 0.02;
    END IF;

    -- Cap MSC at P5,000
    v_base := LEAST(p_monthly_salary, 5000);

    -- Monthly contribution
    v_monthly_share := ROUND(v_base * v_rate, 2);

    -- Cap at P100 monthly (P50 semi-monthly)
    v_monthly_share := LEAST(v_monthly_share, 100);

    -- Semi-monthly
    RETURN ROUND(v_monthly_share / 2, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION compute_pagibig_contribution IS 'Returns semi-monthly Pag-IBIG employee share (1-2% of salary, max P50/cutoff)';

-- ---------------------------------------------------------------------------
-- Function: compute_withholding_tax
-- Computes TRAIN Law semi-monthly withholding tax
-- Uses annualized computation: monthly taxable x 12, apply brackets, / 12
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_withholding_tax(
    p_semi_monthly_taxable DECIMAL(10,2)
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_annual_taxable DECIMAL(12,2);
    v_annual_tax DECIMAL(12,2);
BEGIN
    -- Annualize: semi-monthly x 24
    v_annual_taxable := p_semi_monthly_taxable * 24;

    -- TRAIN Law progressive brackets
    IF v_annual_taxable <= 250000 THEN
        v_annual_tax := 0;
    ELSIF v_annual_taxable <= 400000 THEN
        v_annual_tax := (v_annual_taxable - 250000) * 0.15;
    ELSIF v_annual_taxable <= 800000 THEN
        v_annual_tax := 22500 + (v_annual_taxable - 400000) * 0.20;
    ELSIF v_annual_taxable <= 2000000 THEN
        v_annual_tax := 102500 + (v_annual_taxable - 800000) * 0.25;
    ELSIF v_annual_taxable <= 8000000 THEN
        v_annual_tax := 402500 + (v_annual_taxable - 2000000) * 0.30;
    ELSE
        v_annual_tax := 2202500 + (v_annual_taxable - 8000000) * 0.35;
    END IF;

    -- De-annualize back to semi-monthly
    RETURN ROUND(v_annual_tax / 24, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION compute_withholding_tax IS 'Returns semi-monthly TRAIN Law withholding tax using annualized bracket computation';

-- ---------------------------------------------------------------------------
-- Function: get_payroll_period_summary
-- Returns aggregate summary for a payroll period
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_payroll_period_summary(p_period_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'period_id', p_period_id,
        'total_employees', COUNT(*),
        'total_gross', COALESCE(SUM(gross_pay), 0),
        'total_basic', COALESCE(SUM(basic_pay), 0),
        'total_overtime', COALESCE(SUM(overtime_pay), 0),
        'total_sss', COALESCE(SUM(sss_deduction), 0),
        'total_philhealth', COALESCE(SUM(philhealth_deduction), 0),
        'total_pagibig', COALESCE(SUM(pagibig_deduction), 0),
        'total_tax', COALESCE(SUM(tax_deduction), 0),
        'total_cash_advance', COALESCE(SUM(cash_advance_deduction), 0),
        'total_deductions', COALESCE(SUM(total_deductions), 0),
        'total_net', COALESCE(SUM(net_pay), 0),
        'status_breakdown', (
            SELECT json_object_agg(status, cnt)
            FROM (
                SELECT status, COUNT(*) AS cnt
                FROM payroll_records
                WHERE payroll_period_id = p_period_id
                GROUP BY status
            ) sub
        )
    ) INTO result
    FROM payroll_records
    WHERE payroll_period_id = p_period_id;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_payroll_period_summary IS 'Returns aggregate payroll summary for a period including totals and status breakdown';

-- ---------------------------------------------------------------------------
-- Function: validate_payroll_period_no_overlap
-- Ensures no overlapping payroll periods exist
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_payroll_period_no_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM payroll_periods
        WHERE id != COALESCE(NEW.id, gen_random_uuid())
          AND start_date <= NEW.end_date
          AND end_date >= NEW.start_date
          AND cutoff_type = NEW.cutoff_type
    ) THEN
        RAISE EXCEPTION 'Payroll period overlaps with an existing period of the same cutoff type';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payroll_period_no_overlap
    BEFORE INSERT OR UPDATE ON payroll_periods
    FOR EACH ROW
    EXECUTE FUNCTION validate_payroll_period_no_overlap();

-- ---------------------------------------------------------------------------
-- View: v_payroll_register
-- Complete payroll register view for HR reporting
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_payroll_register AS
SELECT
    pr.id,
    pr.payroll_period_id,
    pp.name AS period_name,
    pp.start_date AS period_start,
    pp.end_date AS period_end,
    pr.employee_id,
    e.employee_no,
    (e.first_name || ' ' || e.last_name) AS employee_name,
    e.department,
    e.position,
    pr.days_worked,
    pr.basic_pay,
    pr.overtime_pay,
    pr.gross_pay,
    pr.sss_deduction,
    pr.philhealth_deduction,
    pr.pagibig_deduction,
    pr.tax_deduction,
    pr.cash_advance_deduction,
    pr.late_deduction,
    pr.unpaid_leave_deduction,
    pr.total_deductions,
    pr.net_pay,
    pr.status
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
JOIN payroll_periods pp ON pp.id = pr.payroll_period_id
ORDER BY pp.start_date DESC, e.last_name, e.first_name;

COMMENT ON VIEW v_payroll_register IS 'Complete payroll register with employee and period details for HR reporting';
