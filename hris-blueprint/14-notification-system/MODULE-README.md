# Module 14: Notification System

## Purpose

Notification infrastructure for delivering alerts, announcements, and status updates to users. In the current HRIS implementation, this module is **largely unimplemented** -- infrastructure packages are installed but not actively used. Client-side feedback is handled exclusively through Radix UI toast notifications (ephemeral, not persisted). This blueprint documents the installed infrastructure, the placeholder schema for future implementation, and recommendations for Scholaris.

## Current Implementation Status

| Component | Status | Details |
|-----------|--------|---------|
| WebSocket (ws package) | Installed, dormant | Package is in dependencies but no WebSocket server is initialized |
| Web Push (web-push package) | Installed, configured | VAPID keys are configured in .env but no push subscription endpoints exist |
| Toast notifications (Radix UI) | Active | Client-side only; used throughout the app for success/error feedback |
| Notification bell/center | Not implemented | No notification icon in header, no notification dropdown |
| Persistent notifications | Not implemented | No database-backed notifications, no read/unread tracking |
| Email notifications | Not implemented | No email sending for leave approvals, payroll releases, etc. |

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| (toast usage) | client/src/components/ui/toast.tsx | Frontend | Radix UI toast primitives used across all pages |
| (toast hook) | client/src/hooks/use-toast.ts | Frontend | Toast trigger hook: `toast({ title, description, variant })` |
| .env (partial) | .env | Config | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL configured |

## Key Features (Planned/Infrastructure Only)

- **Toast Notifications**: Ephemeral client-side alerts for action feedback (success, error, info)
- **WebSocket Ready**: `ws` package available for real-time push if implemented
- **Web Push Ready**: `web-push` package with VAPID keys for browser push notifications
- **No Persistent Store**: No notification table, no read/unread state, no notification history

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| -- | -- | -- | No notification-specific API endpoints exist in the current HRIS |

## Dependencies

### Installed but Dormant Packages
- **ws** (v8.18.0) -- WebSocket library for real-time server-to-client communication
- **web-push** (v3.6.7) -- Web Push API for browser push notifications

### Active Packages
- **@radix-ui/react-toast** (v1.2.4) -- Toast notification primitives used throughout client

### Environment Variables (Configured)
- `VAPID_PUBLIC_KEY` -- Public key for Web Push subscription
- `VAPID_PRIVATE_KEY` -- Private key for Web Push message signing
- `VAPID_EMAIL` -- Contact email for push notification service

## Database Tables

| Table | Owned | Description |
|-------|-------|-------------|
| notifications | Planned | Persistent notification storage (schema below for Scholaris implementation) |
| notification_preferences | Planned | Per-user channel preferences (schema below for Scholaris implementation) |

## Business Logic Rules (For Future Implementation)

| Rule | Description |
|------|-------------|
| Notification triggers | Leave approved/rejected, payroll released, task assigned, disciplinary issued |
| Delivery channels | In-app (persistent), toast (ephemeral), web push (browser), email (planned) |
| Read tracking | Mark individual notifications as read; mark all as read |
| Preference respect | Check user preferences before sending on each channel |
| Batch digest | Group multiple notifications into a single email digest (e.g., daily summary) |

## Recommended Notification Triggers

| Event | Source Module | Recipients | Channels |
|-------|-------------|------------|----------|
| Leave request submitted | 06-leave-management | HR, Admin | In-app, email |
| Leave approved/rejected | 06-leave-management | Requesting employee | In-app, push, email |
| Payroll released | 08-payroll-system | All affected employees | In-app, push, email |
| Task assigned | 17-task-management | Assigned employee | In-app, push |
| Task status changed | 17-task-management | Project manager | In-app |
| Expense submitted | 18-expense-management | HR, Admin | In-app |
| Expense approved/rejected | 18-expense-management | Requesting employee | In-app, push |
| NTE issued | 09-disciplinary | Affected employee | In-app, email |
| Cash advance approved | 07-loans-management | Requesting employee | In-app, push |
| New devotional posted | 11-devotional | All employees | In-app |

## Scholaris Adaptation Notes

- **Critical module to build**: Scholaris needs a fully functional notification system from day one
- **Announcement broadcasts**: School-wide, grade-level, section-level, and individual announcements
- **Grade notifications**: Notify parents when grades are posted or updated
- **Payment reminders**: Automated tuition payment reminders to parents before due dates
- **Enrollment alerts**: Notify parents of enrollment period opening, deadlines, and slot availability
- **Schedule changes**: Push notifications for class cancellations, room changes, substitute teachers
- **Emergency alerts**: Priority notification channel for school emergencies (lockdown, weather closure)
- **Parent communication**: Two-way messaging between faculty and parents (with admin oversight)
- **SMS integration**: Many Filipino parents may not check email -- consider SMS gateway integration (e.g., Semaphore, Globe Labs)
- **Multi-language**: Consider English/Filipino notification templates for parent audience
