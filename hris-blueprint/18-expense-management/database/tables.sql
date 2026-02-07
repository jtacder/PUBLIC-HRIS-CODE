-- Module 18: Expense Management - Table Definitions
-- Reverse-engineered from ElectroManage ERP documentation

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    description TEXT,
    receipt_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Reimbursed')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_notes TEXT,
    reimbursed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    approved_by UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Approved', 'Rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expense_requester_status ON expenses(requester_id, status);
CREATE INDEX idx_expense_project ON expenses(project_id);
CREATE INDEX idx_expense_status ON expenses(status);
CREATE INDEX idx_expense_created ON expenses(created_at);
