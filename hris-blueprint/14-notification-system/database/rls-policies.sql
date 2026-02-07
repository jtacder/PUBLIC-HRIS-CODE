-- ============================================================================
-- Module 14: Notification System
-- File: rls-policies.sql
-- Row Level Security Policies
-- ============================================================================
-- NOTE: These policies are PLACEHOLDER for Scholaris implementation.
-- The current HRIS does not use persistent notifications.
-- ============================================================================

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notification_preferences table
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Enable RLS on push_subscriptions table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Policies: notifications
-- ---------------------------------------------------------------------------

-- Users can only read their own notifications
CREATE POLICY notifications_self_select ON notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- ADMIN can view all notifications (for support/debugging)
CREATE POLICY notifications_admin_select ON notifications
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = current_setting('app.current_user_id')::UUID
              AND u.role = 'ADMIN'
        )
    );

-- System (server-side) can insert notifications for any user
CREATE POLICY notifications_system_insert ON notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_self_update ON notifications
    FOR UPDATE
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    )
    WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- Users can delete their own notifications (dismiss)
CREATE POLICY notifications_self_delete ON notifications
    FOR DELETE
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- ---------------------------------------------------------------------------
-- Policies: notification_preferences
-- ---------------------------------------------------------------------------

-- Users can read their own preferences
CREATE POLICY notification_prefs_self_select ON notification_preferences
    FOR SELECT
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- Users can insert their own preferences
CREATE POLICY notification_prefs_self_insert ON notification_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- Users can update their own preferences
CREATE POLICY notification_prefs_self_update ON notification_preferences
    FOR UPDATE
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    )
    WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- ---------------------------------------------------------------------------
-- Policies: push_subscriptions
-- ---------------------------------------------------------------------------

-- Users can manage their own push subscriptions
CREATE POLICY push_subs_self_select ON push_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

CREATE POLICY push_subs_self_insert ON push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = current_setting('app.current_user_id')::UUID
    );

CREATE POLICY push_subs_self_delete ON push_subscriptions
    FOR DELETE
    TO authenticated
    USING (
        user_id = current_setting('app.current_user_id')::UUID
    );

-- ---------------------------------------------------------------------------
-- Access Control Summary:
--   ADMIN   : Read all notifications (support), manage own preferences
--   HR      : Read/manage own notifications and preferences only
--   ENGINEER: Read/manage own notifications and preferences only
--   WORKER  : Read/manage own notifications and preferences only
--   System  : Insert notifications for any user (server-side triggers)
-- ---------------------------------------------------------------------------
