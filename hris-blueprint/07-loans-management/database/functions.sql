-- ============================================================================
-- Module 07: Loans Management (Cash Advances)
-- File: functions.sql
-- Database Functions and Triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Trigger: Auto-update updated_at on cash_advances
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_cash_advances_updated_at
    BEFORE UPDATE ON cash_advances
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger Function: Auto-transition to Fully_Paid when balance reaches zero
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_cash_advance_auto_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- When remaining_balance reaches 0 on a Disbursed advance, mark as Fully_Paid
    IF NEW.remaining_balance = 0 AND NEW.status = 'Disbursed' THEN
        NEW.status := 'Fully_Paid';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cash_advance_auto_fully_paid
    BEFORE UPDATE ON cash_advances
    FOR EACH ROW
    WHEN (NEW.remaining_balance = 0 AND OLD.remaining_balance > 0)
    EXECUTE FUNCTION trigger_cash_advance_auto_complete();

-- ---------------------------------------------------------------------------
-- Trigger Function: Set remaining_balance on disbursement
-- When status transitions to Disbursed, set remaining_balance = amount
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_cash_advance_disbursement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Disbursed' AND OLD.status = 'Approved' THEN
        NEW.remaining_balance := NEW.amount;
        NEW.disbursed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cash_advance_on_disburse
    BEFORE UPDATE ON cash_advances
    FOR EACH ROW
    WHEN (NEW.status = 'Disbursed' AND OLD.status = 'Approved')
    EXECUTE FUNCTION trigger_cash_advance_disbursement();

-- ---------------------------------------------------------------------------
-- Trigger Function: Validate status transitions
-- Ensures only valid state transitions are allowed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_cash_advance_status_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Define valid transitions
    IF OLD.status = 'Pending' AND NEW.status NOT IN ('Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid status transition from Pending to %. Allowed: Approved, Rejected', NEW.status;
    END IF;

    IF OLD.status = 'Approved' AND NEW.status NOT IN ('Disbursed', 'Rejected') THEN
        RAISE EXCEPTION 'Invalid status transition from Approved to %. Allowed: Disbursed, Rejected', NEW.status;
    END IF;

    IF OLD.status = 'Disbursed' AND NEW.status NOT IN ('Disbursed', 'Fully_Paid') THEN
        RAISE EXCEPTION 'Invalid status transition from Disbursed to %. Allowed: Fully_Paid', NEW.status;
    END IF;

    IF OLD.status IN ('Rejected', 'Fully_Paid') THEN
        RAISE EXCEPTION 'Cannot change status from %. This is a terminal state.', OLD.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cash_advance_validate_status
    BEFORE UPDATE ON cash_advances
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trigger_cash_advance_status_validation();

-- ---------------------------------------------------------------------------
-- Function: apply_cash_advance_deduction
-- Applies a payroll deduction to a cash advance and records it
-- Returns the actual deduction amount (may be less than deduction_per_cutoff
-- if remaining_balance < deduction_per_cutoff)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_cash_advance_deduction(
    p_cash_advance_id UUID,
    p_payroll_record_id UUID,
    p_deduction_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_advance cash_advances%ROWTYPE;
    v_deduction_amount DECIMAL(10,2);
BEGIN
    -- Fetch the cash advance with lock
    SELECT * INTO v_advance
    FROM cash_advances
    WHERE id = p_cash_advance_id
    FOR UPDATE;

    -- Validate status
    IF v_advance.status != 'Disbursed' THEN
        RAISE EXCEPTION 'Cash advance % is not in Disbursed status. Current: %',
            p_cash_advance_id, v_advance.status;
    END IF;

    -- Calculate actual deduction: min(deduction_per_cutoff, remaining_balance)
    v_deduction_amount := LEAST(v_advance.deduction_per_cutoff, v_advance.remaining_balance);

    -- Skip if nothing to deduct
    IF v_deduction_amount <= 0 THEN
        RETURN 0;
    END IF;

    -- Record the deduction
    INSERT INTO cash_advance_deductions (cash_advance_id, payroll_record_id, amount, deduction_date)
    VALUES (p_cash_advance_id, p_payroll_record_id, v_deduction_amount, p_deduction_date);

    -- Update remaining balance (trigger will auto-set Fully_Paid if balance = 0)
    UPDATE cash_advances
    SET remaining_balance = remaining_balance - v_deduction_amount,
        updated_at = NOW()
    WHERE id = p_cash_advance_id;

    RETURN v_deduction_amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION apply_cash_advance_deduction IS 'Applies a payroll deduction to a cash advance, recording the deduction and updating the balance';

-- ---------------------------------------------------------------------------
-- Function: get_active_cash_advances_for_employee
-- Returns all active (Disbursed) cash advances with remaining balance
-- for payroll computation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_cash_advances_for_employee(p_employee_id UUID)
RETURNS TABLE(
    cash_advance_id UUID,
    amount DECIMAL(10,2),
    deduction_per_cutoff DECIMAL(10,2),
    remaining_balance DECIMAL(10,2),
    actual_deduction DECIMAL(10,2),
    disbursed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ca.id,
        ca.amount,
        ca.deduction_per_cutoff,
        ca.remaining_balance,
        LEAST(ca.deduction_per_cutoff, ca.remaining_balance) AS actual_deduction,
        ca.disbursed_at
    FROM cash_advances ca
    WHERE ca.employee_id = p_employee_id
      AND ca.status = 'Disbursed'
      AND ca.remaining_balance > 0
    ORDER BY ca.disbursed_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_cash_advances_for_employee IS 'Returns active disbursed cash advances with calculated deduction amounts for payroll';

-- ---------------------------------------------------------------------------
-- Function: get_cash_advance_summary
-- Returns summary statistics for cash advances (for dashboard/reports)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_cash_advance_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending_count', (SELECT COUNT(*) FROM cash_advances WHERE status = 'Pending'),
        'pending_total', (SELECT COALESCE(SUM(amount), 0) FROM cash_advances WHERE status = 'Pending'),
        'approved_count', (SELECT COUNT(*) FROM cash_advances WHERE status = 'Approved'),
        'disbursed_count', (SELECT COUNT(*) FROM cash_advances WHERE status = 'Disbursed'),
        'disbursed_total_outstanding', (SELECT COALESCE(SUM(remaining_balance), 0) FROM cash_advances WHERE status = 'Disbursed'),
        'fully_paid_count', (SELECT COUNT(*) FROM cash_advances WHERE status = 'Fully_Paid'),
        'total_disbursed_all_time', (SELECT COALESCE(SUM(amount), 0) FROM cash_advances WHERE status IN ('Disbursed', 'Fully_Paid'))
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_cash_advance_summary IS 'Returns aggregate cash advance statistics for dashboard display';

-- ---------------------------------------------------------------------------
-- View: v_cash_advance_with_employee
-- Cash advances with employee details for listing pages
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_cash_advance_with_employee AS
SELECT
    ca.id,
    ca.employee_id,
    e.employee_no,
    (e.first_name || ' ' || e.last_name) AS employee_name,
    e.department,
    ca.amount,
    ca.purpose,
    ca.deduction_per_cutoff,
    ca.remaining_balance,
    ca.status,
    ca.approved_by,
    ca.approved_at,
    ca.disbursed_at,
    ca.rejection_reason,
    ca.created_at,
    -- Calculated fields
    (ca.amount - ca.remaining_balance) AS total_deducted,
    CASE
        WHEN ca.deduction_per_cutoff > 0
        THEN CEIL(ca.remaining_balance / ca.deduction_per_cutoff)
        ELSE 0
    END AS estimated_cutoffs_remaining
FROM cash_advances ca
JOIN employees e ON e.id = ca.employee_id
ORDER BY ca.created_at DESC;

COMMENT ON VIEW v_cash_advance_with_employee IS 'Cash advances with employee details and calculated deduction progress';
