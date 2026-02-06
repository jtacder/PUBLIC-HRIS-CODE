# Railway + Supabase Deployment Master Prompt Guide

## Deploy the HRIS System on Railway (Backend) + Supabase (Database)

This is a step-by-step guide and **master prompt** for deploying the extracted HRIS system. It covers everything from creating accounts to production deployment with custom domains.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Account Setup](#2-prerequisites--account-setup)
3. [Supabase Database Setup](#3-supabase-database-setup)
4. [Codebase Preparation](#4-codebase-preparation)
5. [Railway Deployment](#5-railway-deployment)
6. [Environment Variables Configuration](#6-environment-variables-configuration)
7. [Database Migration & Seeding](#7-database-migration--seeding)
8. [Custom Domain Setup](#8-custom-domain-setup)
9. [Production Checklist](#9-production-checklist)
10. [Master Prompt for AI Assistants](#10-master-prompt-for-ai-assistants)
11. [Troubleshooting](#11-troubleshooting)
12. [Cost Estimates](#12-cost-estimates)

---

## 1. ARCHITECTURE OVERVIEW

```
┌──────────────────────┐         ┌──────────────────────┐
│      RAILWAY         │         │      SUPABASE        │
│   (Application)      │         │    (Database)        │
│                      │         │                      │
│  ┌────────────────┐  │  TCP    │  ┌────────────────┐  │
│  │  Node.js       │──┼────────▶│  │  PostgreSQL    │  │
│  │  Express.js    │  │  :5432  │  │  (Managed)     │  │
│  │  React (built) │  │         │  │                │  │
│  └────────────────┘  │         │  │  - 40+ tables  │  │
│                      │         │  │  - 30+ indexes │  │
│  Port: 5000          │         │  │  - Sessions    │  │
│  (auto-mapped)       │         │  └────────────────┘  │
│                      │         │                      │
│  HTTPS endpoint      │         │  Connection pooler   │
│  *.up.railway.app    │         │  (Supavisor)         │
└──────────────────────┘         └──────────────────────┘
```

**Why Railway + Supabase?**

| Concern | Railway | Supabase |
|---------|---------|----------|
| **App hosting** | Node.js with auto-deploy from Git | N/A |
| **Database** | N/A (use Supabase) | Managed PostgreSQL with backups |
| **SSL** | Auto HTTPS | Auto SSL for connections |
| **Scaling** | Vertical (up to 32 GB RAM) | Up to 8 GB RAM (Pro plan) |
| **Free tier** | $5 credit/month (Hobby) | 500 MB database free |
| **Cost** | ~$5-20/month | Free - $25/month |

---

## 2. PREREQUISITES & ACCOUNT SETUP

### 2.1 Create Accounts

1. **Supabase** — https://supabase.com
   - Sign up with GitHub
   - Free tier: 500 MB database, 2 projects

2. **Railway** — https://railway.app
   - Sign up with GitHub
   - Hobby plan: $5/month credit included

3. **GitHub** — Your code must be in a GitHub repository

### 2.2 Local Tools Required

```bash
# Node.js 20+
node --version   # Should be 20.x or higher

# npm 10+
npm --version    # Should be 10.x or higher

# Git
git --version

# Railway CLI (optional but recommended)
npm install -g @railway/cli
railway login

# Supabase CLI (optional)
npm install -g supabase
```

---

## 3. SUPABASE DATABASE SETUP

### 3.1 Create Project

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Configure:
   - **Name:** `school-hris` (or your project name)
   - **Database Password:** Generate a strong password and **SAVE IT** — you'll need it
   - **Region:** Choose closest to your users
     - For Philippines: `Singapore (Southeast Asia)` — `ap-southeast-1`
   - **Plan:** Free (to start) or Pro ($25/month)
4. Click **"Create new project"**
5. Wait for provisioning (~2 minutes)

### 3.2 Get Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **"Connection string"**
3. Select **"URI"** tab
4. Copy the connection string. It looks like:

```
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**IMPORTANT:** There are TWO connection modes:

| Mode | Port | Use Case |
|------|------|----------|
| **Session mode (Transaction)** | 6543 | For web apps with connection pooling (USE THIS) |
| **Direct connection** | 5432 | For migrations and admin tasks |

**For Railway deployment, use the Session mode (port 6543) connection string.**

**For running migrations locally, use the Direct connection (port 5432).**

### 3.3 Connection String Format

```bash
# For Railway app (session mode via Supavisor pooler):
DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

# For local migrations (direct connection):
DIRECT_DATABASE_URL=postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

### 3.4 Configure Supabase for External Access

By default, Supabase databases are accessible externally. Verify:

1. Go to **Settings** → **Database**
2. Under **"Connection info"**, ensure your connection details are shown
3. The pooler endpoint (`pooler.supabase.com`) is what Railway will connect to

---

## 4. CODEBASE PREPARATION

### 4.1 Remove Replit-Specific Code

Edit `vite.config.ts` to remove Replit plugins:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
```

### 4.2 Remove Replit Dependencies

```bash
npm uninstall @replit/object-storage @replit/vite-plugin-cartographer \
  @replit/vite-plugin-dev-banner @replit/vite-plugin-runtime-error-modal
```

### 4.3 Update server/index.ts for Railway

Ensure the server binds to `0.0.0.0` and uses the `PORT` env variable:

```typescript
// In server/index.ts — make sure this is how the server starts:
const PORT = parseInt(process.env.PORT || "5000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Railway automatically sets the `PORT` environment variable.** Your app MUST listen on `0.0.0.0` (not `localhost` or `127.0.0.1`).

### 4.4 Update Build Script

Ensure `package.json` has proper build and start scripts:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "tsx script/build.ts",
    "start": "NODE_ENV=production node dist/index.cjs",
    "db:push": "drizzle-kit push"
  }
}
```

Railway will run:
1. `npm install` (automatically)
2. `npm run build` (if build script exists)
3. `npm start` (to start the server)

### 4.5 Create/Verify Build Script

If `script/build.ts` doesn't exist, create it:

```typescript
// script/build.ts
import * as esbuild from "esbuild";
import { execSync } from "child_process";
import path from "path";

// Build frontend with Vite
console.log("Building frontend...");
execSync("npx vite build", { stdio: "inherit" });

// Build backend with esbuild
console.log("Building backend...");
await esbuild.build({
  entryPoints: ["server/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  outfile: "dist/index.cjs",
  format: "cjs",
  external: [
    "pg-native",
    "bufferutil",
    "utf-8-validate",
    "bcrypt",
  ],
  sourcemap: true,
});

console.log("Build complete!");
```

### 4.6 Add Nixpacks Configuration (Railway Build)

Create `nixpacks.toml` in project root:

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm-10_x"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

Or alternatively, create a `Procfile`:

```
web: npm start
```

### 4.7 Add Health Check Endpoint

Ensure your server has a health check (Railway uses this):

```typescript
// This should already exist in your routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
```

### 4.8 Commit and Push

```bash
git add -A
git commit -m "Prepare for Railway + Supabase deployment"
git push origin main
```

---

## 5. RAILWAY DEPLOYMENT

### 5.1 Create Railway Project

**Option A: Railway Dashboard (Recommended for first time)**

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub Repo"**
3. Select your repository
4. Railway will auto-detect Node.js
5. Click **"Deploy"**

**Option B: Railway CLI**

```bash
# Login
railway login

# Initialize project
railway init

# Link to GitHub repo
railway link

# Deploy
railway up
```

### 5.2 Configure Railway Service

1. In Railway dashboard, click on your service
2. Go to **Settings** tab
3. Configure:

| Setting | Value |
|---------|-------|
| **Build Command** | `npm run build` (auto-detected) |
| **Start Command** | `npm start` (auto-detected) |
| **Watch Paths** | `/**` |
| **Root Directory** | `/` |
| **Health Check Path** | `/api/health` |
| **Restart Policy** | `Always` |

### 5.3 Generate Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. You'll get: `your-project.up.railway.app`

---

## 6. ENVIRONMENT VARIABLES CONFIGURATION

### 6.1 Set Variables in Railway

Go to your Railway service → **Variables** tab → Add each:

```bash
# REQUIRED
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
SESSION_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=production
PORT=5000

# RECOMMENDED
SUPERADMIN_PASSWORD=<your secure admin password>

# OPTIONAL
SENTRY_DSN=<your Sentry DSN>
VITE_SENTRY_DSN=<your frontend Sentry DSN>
EMAIL_ENABLED=false
APP_URL=https://your-project.up.railway.app
```

**How to generate SESSION_SECRET:**
```bash
openssl rand -hex 32
# Output: e.g., a3f2b1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1
```

### 6.2 Important Notes

- **DATABASE_URL:** Use the Supabase **pooler** connection (port 6543)
- **SESSION_SECRET:** Must be at least 32 characters
- **NODE_ENV:** Set to `production` for security headers, cookie settings
- Railway automatically provides `PORT` but setting it explicitly is fine

---

## 7. DATABASE MIGRATION & SEEDING

### 7.1 Push Schema to Supabase

You have two options:

**Option A: From your local machine (recommended for first time)**

```bash
# Set the DIRECT connection URL (port 5432, not 6543)
export DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Push the Drizzle schema
npm run db:push
```

**Option B: From Railway (via Railway CLI)**

```bash
railway run npm run db:push
```

### 7.2 Seed Superadmin Account

```bash
# Locally with direct connection
export DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
export SUPERADMIN_PASSWORD=YourSecurePassword123!

npx tsx server/seed-superadmin.ts
```

Or via Railway:
```bash
railway run npx tsx server/seed-superadmin.ts
```

### 7.3 Seed Permissions (if needed)

```bash
railway run npx tsx server/seed-permissions.ts
```

### 7.4 Verify Database

In Supabase dashboard:
1. Go to **Table Editor**
2. You should see all 40+ tables created
3. Check `users` table — superadmin account should exist

---

## 8. CUSTOM DOMAIN SETUP

### 8.1 Railway Custom Domain

1. In Railway service → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Enter your domain: `hris.yourschool.edu.ph`
4. Railway provides CNAME records
5. Add to your DNS provider:

```
Type: CNAME
Name: hris
Value: your-project.up.railway.app
TTL: 300
```

6. Wait for DNS propagation (5-30 minutes)
7. Railway auto-provisions SSL certificate

### 8.2 Update APP_URL

After setting custom domain, update the Railway environment variable:

```bash
APP_URL=https://hris.yourschool.edu.ph
```

---

## 9. PRODUCTION CHECKLIST

### Security

- [ ] `SESSION_SECRET` is randomly generated (32+ chars)
- [ ] `NODE_ENV=production` is set
- [ ] `SUPERADMIN_PASSWORD` is strong and saved securely
- [ ] Database password is strong
- [ ] Supabase Row Level Security (RLS) considered
- [ ] HTTPS enabled (Railway auto-handles this)

### Performance

- [ ] Database is in same region as Railway (both in Singapore for PH users)
- [ ] Connection pooling via Supabase Supavisor (port 6543)
- [ ] Static assets have cache headers
- [ ] React code splitting (lazy loading) enabled

### Monitoring

- [ ] Health check endpoint `/api/health` working
- [ ] Sentry configured for error tracking (optional but recommended)
- [ ] Railway deployment logs accessible
- [ ] Supabase database metrics dashboard reviewed

### Backup

- [ ] Supabase automatic backups enabled (Pro plan: daily, 7 days retention)
- [ ] Database password stored in password manager
- [ ] Environment variables documented

### Post-Deployment Testing

- [ ] Login works with superadmin account
- [ ] Employee CRUD works
- [ ] Attendance clock-in works (QR + GPS)
- [ ] Payroll computation runs correctly
- [ ] Leave request workflow works
- [ ] All sidebar navigation items load
- [ ] Mobile responsiveness works

---

## 10. MASTER PROMPT FOR AI ASSISTANTS

Use this prompt when asking an AI assistant (Claude, ChatGPT, etc.) to help you deploy or modify the system:

---

### MASTER DEPLOYMENT PROMPT

```
I have an HRIS (Human Resource Information System) that I need to deploy on
Railway (application hosting) + Supabase (PostgreSQL database).

SYSTEM ARCHITECTURE:
- Monorepo: React 18 frontend + Express.js backend + PostgreSQL
- Frontend: React 18, Vite 7, TanStack Query, Shadcn/UI, Tailwind CSS, Wouter routing
- Backend: Express.js 4, TypeScript, Drizzle ORM 0.39, Passport.js auth, bcrypt
- Database: PostgreSQL with 40+ tables defined in shared/schema.ts using Drizzle ORM
- Build: Vite builds frontend to dist/public/, esbuild bundles server to dist/index.cjs
- Start: "npm start" runs "node dist/index.cjs" which serves both API and static files

KEY FILES:
- shared/schema.ts — All 40+ database table definitions (Drizzle ORM)
- server/index.ts — Express app entry (must listen on 0.0.0.0:PORT)
- server/storage.ts — All database CRUD operations (800+ lines)
- server/email-auth.ts — Session auth, CSRF, login/logout, hasRole middleware
- server/payroll-calculator.ts — Philippine payroll (SSS, PhilHealth, Pag-IBIG, tax)
- server/config/index.ts — Centralized config with Zod env validation
- server/routes/ — 14 modularized route files
- client/src/App.tsx — React routes, sidebar, Suspense

ENVIRONMENT VARIABLES NEEDED:
- DATABASE_URL: Supabase pooler connection string (port 6543)
- SESSION_SECRET: 32+ char random hex string
- NODE_ENV: production
- PORT: 5000 (Railway provides this)
- SUPERADMIN_PASSWORD: For seeding admin account

DEPLOYMENT STEPS:
1. Create Supabase project (Singapore region for PH users)
2. Get connection string (pooler mode, port 6543)
3. Push to GitHub
4. Create Railway project linked to GitHub repo
5. Set environment variables in Railway
6. Run database migration: npm run db:push (with direct connection port 5432)
7. Seed superadmin: npx tsx server/seed-superadmin.ts
8. Verify deployment at *.up.railway.app

IMPORTANT CONSTRAINTS:
- Server must bind to 0.0.0.0 (not localhost)
- Must use Supabase pooler (port 6543) for Railway connections
- Must use direct connection (port 5432) for migrations
- All dates use Philippine timezone (UTC+8)
- Filipino payroll: SSS, PhilHealth, Pag-IBIG, TRAIN Law tax brackets
- Session-based auth with PostgreSQL session store
- 22 working days/month for payroll calculations

WHAT I NEED HELP WITH:
[Describe your specific request here]
```

---

### MASTER CUSTOMIZATION PROMPT (for School Adaptation)

```
I have an HRIS system originally built for a Philippine electrical contracting
company that I want to adapt for a SCHOOL. The system is built with React 18 +
Express.js + PostgreSQL (Drizzle ORM).

CURRENT MODULES:
1. Dashboard — Enterprise overview with stats
2. Employees — Full employee management with 201 files
3. Projects — Multi-site management with geofencing
4. Tasks — Kanban board (Todo/InProgress/Blocked/Done)
5. Schedules — Shift scheduling (day/night)
6. Attendance — QR-based clock-in with GPS geofencing
7. Payroll — Philippine government deductions (SSS, PhilHealth, Pag-IBIG, tax)
8. 201 Files — Complete employee records
9. Disciplinary — NTE workflow (5-day response)
10. Leave & Loans — Leave requests + cash advances
11. HR Settings — Payroll cutoffs, leave types, holidays
12. Devotionals — Daily content management
13. Audit Trail — System activity logging

SCHOOL CONTEXT MAPPING:
- Employees → Faculty & Staff
- Projects → Campuses / School Buildings
- Tasks → Academic Tasks / Administrative Tasks
- Schedules → Teaching Load / Class Schedules
- Geofence → Campus boundaries
- NTE → Show Cause Letters / Incident Reports
- Devotionals → Morning Assembly / Announcements
- Payroll → Same (Philippine payroll applies to schools too)

TECH STACK:
- React 18 + TypeScript + Vite 7 + Tailwind CSS + Shadcn/UI
- Express.js + Drizzle ORM + PostgreSQL
- Deployed on Railway (app) + Supabase (database)

WHAT I NEED:
[Describe your specific school adaptation request here]
```

---

### MASTER TROUBLESHOOTING PROMPT

```
I have an HRIS system deployed on Railway + Supabase that is experiencing issues.

DEPLOYMENT SETUP:
- Railway: Node.js service running Express.js (dist/index.cjs)
- Supabase: PostgreSQL database (Singapore region)
- Connection: Via Supabase pooler (port 6543)
- Auth: Session-based with connect-pg-simple storing sessions in PostgreSQL

COMMON ISSUE AREAS:
1. Database connection: Supabase pooler vs direct connection
2. Session persistence: PostgreSQL session store configuration
3. Build failures: esbuild bundling, Vite client build
4. Port binding: Must use 0.0.0.0 and PORT env var
5. Timezone: All dates must be Philippine time (UTC+8)
6. CSRF: Token validation on state-changing requests

THE ISSUE I'M SEEING:
[Describe the error, logs, or unexpected behavior]

RELEVANT LOGS:
[Paste Railway deployment logs here]
```

---

## 11. TROUBLESHOOTING

### Common Issues

#### "Connection refused" or database not connecting

**Cause:** Wrong connection string or port
**Fix:** Use Supabase pooler URL (port 6543) for the app, direct URL (port 5432) for migrations.

```bash
# Check your DATABASE_URL format:
# CORRECT (pooler):
postgresql://postgres.[ref]:[pw]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# WRONG (direct for app — may hit connection limits):
postgresql://postgres.[ref]:[pw]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

#### Build fails on Railway

**Cause:** Missing build script or esbuild configuration
**Fix:** Ensure `script/build.ts` exists and `npm run build` works locally first.

```bash
# Test build locally
npm run build
# Should create dist/index.cjs and dist/public/
```

#### "ECONNREFUSED 127.0.0.1"

**Cause:** Server listening on localhost instead of 0.0.0.0
**Fix:** In `server/index.ts`:
```typescript
app.listen(PORT, "0.0.0.0", () => { ... });
```

#### Sessions not persisting / logging out immediately

**Cause:** Cookie settings or session store configuration
**Fix:** Ensure production cookie settings:
```typescript
cookie: {
  secure: true,        // HTTPS only in production
  httpOnly: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
}
```

Also verify the `sessions` table exists in Supabase.

#### "CSRF token mismatch"

**Cause:** Frontend not sending CSRF token
**Fix:** Ensure the frontend fetches CSRF token on load:
```typescript
// GET /api/auth/csrf-token → returns { csrfToken }
// Send as X-CSRF-Token header on all POST/PATCH/DELETE requests
```

#### Payroll calculations seem wrong

**Cause:** Likely timezone issues
**Fix:** See `REPLIT_TIMEZONE_FIX_PROMPT.md` — all date operations on Philippine-time-shifted Date objects must use UTC methods (`getUTCHours()`, `setUTCDate()`, etc.)

#### Railway deploy succeeds but app shows blank page

**Cause:** Frontend build output not served correctly
**Fix:** Ensure `server/static.ts` or `server/index.ts` serves `dist/public/`:
```typescript
app.use(express.static(path.join(__dirname, "public")));
// And SPA fallback:
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
```

---

## 12. COST ESTIMATES

### Monthly Costs

| Service | Free Tier | Small School (50 staff) | Medium School (200 staff) |
|---------|-----------|------------------------|--------------------------|
| **Railway (Hobby)** | $5 credit | $5-10/month | $10-20/month |
| **Supabase (Free)** | Free (500 MB) | Free until ~200 MB | $25/month (Pro) |
| **Domain** | N/A | $10-15/year | $10-15/year |
| **Sentry (Free)** | Free (5K errors) | Free | Free |
| **Total** | ~$0-5/month | ~$5-10/month | ~$35-45/month |

### When to Upgrade

| Trigger | Action |
|---------|--------|
| Database > 500 MB | Upgrade Supabase to Pro ($25/month) |
| > 100 concurrent users | Scale Railway RAM |
| Need daily backups | Supabase Pro includes automatic backups |
| Custom email (payslips) | Add Resend ($0/month for 100 emails/day) |

### Railway Pricing Notes

- **Hobby Plan:** $5/month included credit, $0.000231/min for compute
- A typical Node.js app uses ~0.5 vCPU / 512 MB RAM = ~$3-5/month
- Auto-sleeps after 10 min of no traffic (saves cost)

### Supabase Pricing Notes

- **Free:** 500 MB database, 1 GB file storage, 50K auth users
- **Pro ($25/month):** 8 GB database, 100 GB storage, daily backups
- The HRIS schema with 40+ tables uses ~5-10 MB empty, grows with data

---

## QUICK START SUMMARY

```bash
# 1. Create Supabase project → get connection string
# 2. Push code to GitHub
# 3. Create Railway project → link to GitHub
# 4. Set environment variables in Railway:
#    DATABASE_URL, SESSION_SECRET, NODE_ENV=production
# 5. Run migration (locally or via Railway CLI):
#    DATABASE_URL=<direct-url-5432> npm run db:push
# 6. Seed admin:
#    DATABASE_URL=<direct-url-5432> SUPERADMIN_PASSWORD=xxx npx tsx server/seed-superadmin.ts
# 7. Open your Railway URL → login with superadmin credentials
# 8. Done!
```

---

*This guide was generated from the ElectroManage ERP codebase analysis. Update connection strings, passwords, and configurations with your actual values.*
