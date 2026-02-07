# Environment Variables Reference

## Overview

All environment variables are defined in a `.env` file at the project root (gitignored) and validated at server startup using Zod. If any required variable is missing or malformed, the server exits immediately with a descriptive error.

---

## Required Variables

These variables MUST be set for the application to start.

### `DATABASE_URL`

| Property | Value |
|----------|-------|
| **Required** | Yes |
| **Type** | PostgreSQL connection string |
| **Format** | `postgresql://user:password@host:port/database` |
| **Used By** | `server/db.ts` (Drizzle ORM), `connect-pg-simple` (session store) |
| **Description** | Full PostgreSQL connection URI. Used for both the application database and the session store. |

```
DATABASE_URL=postgresql://hris_user:secure_password@localhost:5432/hris_db
```

### `SESSION_SECRET`

| Property | Value |
|----------|-------|
| **Required** | Yes |
| **Type** | String (minimum 32 characters) |
| **Used By** | `express-session` configuration |
| **Description** | Secret key used to sign the session cookie (`connect.sid`). Must be cryptographically random and at least 32 characters long. Changing this value invalidates all existing sessions. |

```
SESSION_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6
```

**Generate a strong secret:**
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# or
openssl rand -hex 32
```

---

## Optional Variables -- Application

These variables have sensible defaults and only need to be set when overriding.

### `PORT`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Default** | `5000` |
| **Type** | Integer |
| **Used By** | Express server listen |
| **Description** | TCP port the Express HTTP server binds to. |

### `NODE_ENV`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Default** | `development` |
| **Type** | Enum: `development`, `production`, `test` |
| **Used By** | Helmet CSP policy, error handler stack trace visibility, session cookie secure flag |
| **Description** | Application environment. Controls security strictness and error verbosity. |

**Behavior by environment:**

| Behavior | `development` | `production` | `test` |
|----------|:------------:|:------------:|:------:|
| CSP allows `unsafe-inline`/`unsafe-eval` | Yes | No | Yes |
| Error responses include stack traces | Yes | No | Yes |
| Session cookie `secure` flag | No | Yes | No |
| Vite HMR proxy active | Yes | No | No |
| Console log level | debug | info | warn |

### `CORS_ORIGIN`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Default** | Same-origin (no CORS headers) |
| **Type** | URL string |
| **Used By** | `cors` middleware |
| **Description** | Allowed origin for cross-origin requests. Only needed if the frontend is served from a different domain than the API. In the standard deployment (Vite builds to `dist/public` served by Express), CORS is not needed. |

### `LOG_LEVEL`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Default** | `info` |
| **Type** | Enum: `debug`, `info`, `warn`, `error` |
| **Used By** | Server logging |
| **Description** | Minimum log level. Messages below this level are suppressed. |

---

## Optional Variables -- Email (Resend)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EMAIL_ENABLED` | Boolean | `false` | Enable email features |
| `RESEND_API_KEY` | String | - | Resend email service API key |
| `EMAIL_FROM_ADDRESS` | String | - | Sender email address |
| `EMAIL_FROM_NAME` | String | - | Sender display name |
| `APP_URL` | String | - | Application URL for email links |

---

## Optional Variables -- Error Tracking (Sentry)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SENTRY_DSN` | String | - | Backend Sentry project DSN |
| `VITE_SENTRY_DSN` | String | - | Frontend Sentry DSN (must start with `VITE_` to be exposed to client) |
| `SENTRY_RELEASE` | String | - | Release version identifier |

---

## Optional Variables -- Maps

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | String | - | Google Maps API key for location picker (must start with `VITE_`) |

---

## Optional Variables -- Push Notifications

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VAPID_PUBLIC_KEY` | String | - | Web push VAPID public key |
| `VAPID_PRIVATE_KEY` | String | - | Web push VAPID private key |
| `VAPID_SUBJECT` | String | - | VAPID subject (mailto: or URL) |

**Generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

---

## Deployment-Specific Variables

These variables are typically set only in production or specific deployment environments.

### `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

| Property | Value |
|----------|-------|
| **Required** | No (alternative to `DATABASE_URL`) |
| **Type** | Individual PostgreSQL connection components |
| **Used By** | `pg` driver (auto-reads these if `DATABASE_URL` is not set) |
| **Description** | Individual PostgreSQL connection parameters. The `pg` driver reads these automatically. If `DATABASE_URL` is set, these are ignored. |

### `UPLOAD_DIR`

| Property | Value |
|----------|-------|
| **Required** | No |
| **Default** | `./uploads` |
| **Type** | Directory path |
| **Used By** | Multer file upload middleware |
| **Description** | Directory where uploaded files (employee documents, receipt photos, attendance snapshots) are stored. In production, consider using cloud storage (S3) instead. |

---

## Complete `.env.example` Template

Copy this template to `.env` in the project root and fill in the required values:

```bash
# ============================================================================
# HRIS System - Environment Variables
# ============================================================================

# --- REQUIRED ---
DATABASE_URL=postgresql://hris_user:password@localhost:5432/hris_db
SESSION_SECRET=generate_a_random_string_at_least_32_characters_long

# --- OPTIONAL - Application ---
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
# CORS_ORIGIN=https://hris.example.com

# --- OPTIONAL - Email (Resend) ---
EMAIL_ENABLED=false
RESEND_API_KEY=
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=ElectroManage ERP
APP_URL=http://localhost:5000

# --- OPTIONAL - Error Tracking (Sentry) ---
SENTRY_DSN=
VITE_SENTRY_DSN=
SENTRY_RELEASE=

# --- OPTIONAL - Maps ---
VITE_GOOGLE_MAPS_API_KEY=

# --- OPTIONAL - Push Notifications ---
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com

# --- OPTIONAL - File Uploads ---
# UPLOAD_DIR=./uploads
```

---

## Scholaris Additional Variables

When adapting for the Scholaris School Management System, the following variables replace or supplement the ones above:

```bash
# ============================================================================
# Scholaris - Additional / Replacement Variables
# ============================================================================

# Supabase (replaces DATABASE_URL + SESSION_SECRET for auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (still needed for Drizzle ORM migrations)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Academic Configuration
SCHOOL_NAME=Scholaris Academy
CURRENT_SCHOOL_YEAR=2026-2027
CURRENT_SEMESTER=1
```

| ElectroManage Variable | Scholaris Replacement | Reason |
|----------------------|----------------------|--------|
| `SESSION_SECRET` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase handles session management via JWT |
| `DATABASE_URL` (for sessions) | `SUPABASE_SERVICE_ROLE_KEY` | Supabase manages the session store |
| `DATABASE_URL` (for data) | `DATABASE_URL` (kept) | Drizzle ORM still needs direct DB access for migrations |
| (none) | `SCHOOL_NAME` | New: school branding |
| (none) | `CURRENT_SCHOOL_YEAR` | New: academic year context |
| (none) | `CURRENT_SEMESTER` | New: semester context |

---

## Security Notes

1. **Never commit `.env` to version control.** The `.gitignore` file already excludes it.
2. **Use strong, unique values** for `SESSION_SECRET` -- at least 48 random bytes encoded as hex.
3. **Rotate `SESSION_SECRET` periodically** in production. Changing it invalidates all active sessions (users must re-login).
4. **Use `DATABASE_URL` with SSL** in production: append `?sslmode=require` to the connection string.
5. **SMTP passwords** should be app-specific passwords, not the account's primary password.
6. **In container deployments**, inject secrets via environment variables or a secrets manager -- do not bake them into the container image.
7. **`VITE_` prefix variables** are exposed to the client bundle. Never put secrets in `VITE_`-prefixed variables.
