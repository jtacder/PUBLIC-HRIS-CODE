-- ============================================================================
-- Module 14: Notification System
-- File: functions.sql
-- Database Functions for Notification Management
-- ============================================================================
-- NOTE: These functions are PLACEHOLDER for Scholaris implementation.
-- The current HRIS does not use persistent notifications.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Function: create_notification
-- Creates a notification for a specific user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'info',
    p_link TEXT DEFAULT NULL,
    p_source_module VARCHAR(100) DEFAULT NULL,
    p_source_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, link, source_module, source_entity_id)
    VALUES (p_user_id, p_title, p_message, p_type, p_link, p_source_module, p_source_entity_id)
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_notification IS 'Creates a persistent notification for a specific user';

-- ---------------------------------------------------------------------------
-- Function: create_bulk_notifications
-- Creates the same notification for multiple users (e.g., announcements)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_bulk_notifications(
    p_user_ids UUID[],
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'announcement',
    p_link TEXT DEFAULT NULL,
    p_source_module VARCHAR(100) DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    INSERT INTO notifications (user_id, title, message, type, link, source_module)
    SELECT
        unnest(p_user_ids),
        p_title,
        p_message,
        p_type,
        p_link,
        p_source_module;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_bulk_notifications IS 'Creates the same notification for multiple users at once';

-- ---------------------------------------------------------------------------
-- Function: mark_notification_read
-- Marks a single notification as read
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE id = p_notification_id
      AND user_id = p_user_id
      AND is_read = false;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_notification_read IS 'Marks a single notification as read for the owning user';

-- ---------------------------------------------------------------------------
-- Function: mark_all_notifications_read
-- Marks all unread notifications as read for a user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET is_read = true
    WHERE user_id = p_user_id
      AND is_read = false;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all unread notifications as read for a specific user';

-- ---------------------------------------------------------------------------
-- Function: get_unread_notification_count
-- Returns the count of unread notifications for a user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
      AND is_read = false;

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_unread_notification_count IS 'Returns the number of unread notifications for a user (for badge count)';

-- ---------------------------------------------------------------------------
-- Function: cleanup_old_notifications
-- Removes notifications older than a specified number of days
-- Default: 90 days retention
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_notifications(p_retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
      AND is_read = true;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Removes read notifications older than the specified retention period (default: 90 days)';

-- ---------------------------------------------------------------------------
-- Function: get_user_notifications
-- Returns paginated notifications for a user with unread-first ordering
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    message TEXT,
    type VARCHAR,
    is_read BOOLEAN,
    link TEXT,
    source_module VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.message,
        n.type,
        n.is_read,
        n.link,
        n.source_module,
        n.created_at
    FROM notifications n
    WHERE n.user_id = p_user_id
      AND (NOT p_unread_only OR n.is_read = false)
    ORDER BY n.is_read ASC, n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_notifications IS 'Returns paginated notifications for a user, unread first';
