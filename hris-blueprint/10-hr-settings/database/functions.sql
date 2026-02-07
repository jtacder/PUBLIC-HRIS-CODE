-- Module 10: HR Settings - Database Functions
-- Reverse-engineered from ElectroManage ERP documentation

-- Prevent duplicate holidays on the same date
CREATE OR REPLACE FUNCTION check_duplicate_holiday()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM holidays
        WHERE date = NEW.date
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    ) THEN
        RAISE EXCEPTION 'A holiday already exists on this date: %', NEW.date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_duplicate_holiday
    BEFORE INSERT OR UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_holiday();

-- Get holidays for a specific year
CREATE OR REPLACE FUNCTION get_holidays_by_year(p_year INTEGER)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    date DATE,
    type VARCHAR,
    year INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT h.id, h.name, h.date, h.type, h.year
    FROM holidays h
    WHERE h.year = p_year
    ORDER BY h.date;
END;
$$ LANGUAGE plpgsql;

-- Get or create a company setting (upsert pattern)
CREATE OR REPLACE FUNCTION upsert_company_setting(
    p_key VARCHAR,
    p_value TEXT,
    p_description TEXT DEFAULT NULL,
    p_updated_by UUID DEFAULT NULL
)
RETURNS company_settings AS $$
DECLARE
    v_result company_settings;
BEGIN
    INSERT INTO company_settings (key, value, description, updated_by, updated_at)
    VALUES (p_key, p_value, COALESCE(p_description, ''), p_updated_by, NOW())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, company_settings.description),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Count working days between two dates (excluding holidays and weekends)
CREATE OR REPLACE FUNCTION count_working_days(
    p_start_date DATE,
    p_end_date DATE,
    p_year INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_date DATE;
BEGIN
    v_date := p_start_date;
    WHILE v_date <= p_end_date LOOP
        -- Skip weekends (0=Sunday, 6=Saturday)
        IF EXTRACT(DOW FROM v_date) NOT IN (0, 6) THEN
            -- Skip holidays
            IF NOT EXISTS (
                SELECT 1 FROM holidays
                WHERE date = v_date
                  AND (year = COALESCE(p_year, EXTRACT(YEAR FROM v_date)::INTEGER))
            ) THEN
                v_count := v_count + 1;
            END IF;
        END IF;
        v_date := v_date + INTERVAL '1 day';
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
