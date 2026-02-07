-- Module 17: Task Management - Database Functions
-- Reverse-engineered from ElectroManage ERP documentation

-- Get task count by status for a project
CREATE OR REPLACE FUNCTION get_task_counts_by_project(p_project_id UUID)
RETURNS TABLE(
    status VARCHAR,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.status, COUNT(*)::BIGINT
    FROM tasks t
    WHERE t.project_id = p_project_id
    GROUP BY t.status
    ORDER BY
        CASE t.status
            WHEN 'Todo' THEN 1
            WHEN 'In_Progress' THEN 2
            WHEN 'Blocked' THEN 3
            WHEN 'Done' THEN 4
        END;
END;
$$ LANGUAGE plpgsql;

-- Get overdue tasks
CREATE OR REPLACE FUNCTION get_overdue_tasks()
RETURNS TABLE(
    task_id UUID,
    title VARCHAR,
    project_id UUID,
    assigned_to_id UUID,
    due_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id AS task_id,
        t.title,
        t.project_id,
        t.assigned_to_id,
        t.due_date,
        (CURRENT_DATE - t.due_date)::INTEGER AS days_overdue
    FROM tasks t
    WHERE t.due_date < CURRENT_DATE
      AND t.status NOT IN ('Done')
    ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Auto-set updated_at on task modification
CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_task_timestamp
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_timestamp();

-- Get task summary for an employee
CREATE OR REPLACE FUNCTION get_employee_task_summary(p_employee_id UUID)
RETURNS TABLE(
    total_tasks BIGINT,
    todo_count BIGINT,
    in_progress_count BIGINT,
    blocked_count BIGINT,
    done_count BIGINT,
    overdue_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_tasks,
        COUNT(CASE WHEN status = 'Todo' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN status = 'In_Progress' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN status = 'Blocked' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN status = 'Done' THEN 1 END)::BIGINT,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'Done' THEN 1 END)::BIGINT
    FROM tasks
    WHERE assigned_to_id = p_employee_id;
END;
$$ LANGUAGE plpgsql;
