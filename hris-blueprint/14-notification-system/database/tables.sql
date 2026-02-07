-- ============================================================================
-- Module 14: Notification System
-- File: tables.sql
-- ============================================================================
-- NOTE: These tables are PLACEHOLDER schemas for Scholaris implementation.
-- The current HRIS does not use persistent notifications.
-- Toast notifications (client-side only) are the current feedback mechanism.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: notifications
-- Description: Persistent notification storage for in-app notification center
-- Status: NOT YET USED in current HRIS -- planned for Scholaris
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification content
    title               VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,
    type                VARCHAR(50) NOT NULL DEFAULT 'info'
                        CHECK (type IN ('info', 'success', 'warning', 'error', 'announcement')),

    -- State
    is_read             BOOLEAN NOT NULL DEFAULT false,

    -- Optional deep link to related page/entity
    link                TEXT,

    -- Source tracking (which module/action generated this notification)
    source_module       VARCHAR(100),
    source_entity_id    UUID,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read)
    WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

COMMENT ON TABLE notifications IS 'Persistent in-app notifications (placeholder -- not yet used in current HRIS)';
COMMENT ON COLUMN notifications.user_id IS 'FK to users -- the notification recipient';
COMMENT ON COLUMN notifications.type IS 'Notification severity/category: info, success, warning, error, announcement';
COMMENT ON COLUMN notifications.is_read IS 'Whether the user has seen/acknowledged this notification';
COMMENT ON COLUMN notifications.link IS 'Optional URL path for deep-linking (e.g., /leave/requests/123)';
COMMENT ON COLUMN notifications.source_module IS 'Module that generated this notification (e.g., leave, payroll, tasks)';

-- ---------------------------------------------------------------------------
-- Table: notification_preferences
-- Description: Per-user notification channel preferences
-- Status: NOT YET USED in current HRIS -- planned for Scholaris
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Channel configuration
    channel             VARCHAR(50) NOT NULL
                        CHECK (channel IN ('in_app', 'email', 'web_push', 'sms')),
    enabled             BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- One preference per user per channel
    CONSTRAINT uq_notification_pref_user_channel UNIQUE (user_id, channel)
);

-- Indexes
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

COMMENT ON TABLE notification_preferences IS 'Per-user notification delivery channel preferences (placeholder -- not yet used)';
COMMENT ON COLUMN notification_preferences.channel IS 'Delivery channel: in_app, email, web_push, sms';
COMMENT ON COLUMN notification_preferences.enabled IS 'Whether this channel is enabled for the user';

-- ---------------------------------------------------------------------------
-- Table: push_subscriptions (for Web Push)
-- Description: Browser push notification subscription data
-- Status: NOT YET USED -- VAPID keys configured but no subscription endpoints
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Web Push subscription object fields
    endpoint            TEXT NOT NULL,
    p256dh_key          TEXT NOT NULL,
    auth_key            TEXT NOT NULL,

    -- Device identification
    user_agent          TEXT,

    -- Timestamps
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- One subscription per endpoint
    CONSTRAINT uq_push_subscription_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

COMMENT ON TABLE push_subscriptions IS 'Web Push API subscription data for browser push notifications (placeholder)';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL from browser subscription';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'Client public key for push encryption';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Client auth secret for push encryption';
