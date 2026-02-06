# ElectroManage ERP - Deep Feature Audit Report
**Generated:** 2026-01-31
**Codebase:** 57,534 lines of TypeScript across 216 files
**Architecture:** Full-stack React + Express + PostgreSQL

---

# SECTION 1: CORE MODULES BREAKDOWN

## 1.1 HRIS & Payroll Module

### Salary Calculation Logic

**File:** `/server/payroll-calculator.ts`

#### Basic Pay Formula
```
Basic Pay = Days Worked × Daily Rate
```
- Configuration: 22 working days/month (`server/config/index.ts:49`)
- Rate types: Daily or Monthly (monthly rates auto-converted to daily)

#### Overtime Pay Calculation (Lines 310-335)
| OT Type | Multiplier | Formula |
|---------|------------|---------|
| Regular | 1.25× | `hours × hourlyRate × 1.25` |
| Rest Day | 1.30× | `hours × hourlyRate × 1.30` |
| Holiday | 2.00× | `hours × hourlyRate × 2.00` |

**Important:** OT is calculated from GROSS minutes worked (before lunch deduction)

#### Tax Deductions

**SSS Contribution** (Lines 72-140)
- 57 salary brackets from ₱4,000 to ₱30,000+ MSC
- Uses 2024 RA 11199 contribution tables
- Max semi-monthly: ₱675

**PhilHealth Contribution** (Lines 148-158)
```
Rate: 5% of basic salary (2.5% employee share)
Floor: ₱10,000 | Ceiling: ₱100,000
Semi-monthly Max: ₱1,250
```

**Pag-IBIG Contribution** (Lines 166-179)
```
Salary ≤ ₱1,500: 1%
Salary > ₱1,500: 2% (max MSC ₱5,000)
Semi-monthly Max: ₱50
```

**TRAIN Law Withholding Tax** (Lines 188-235)
- 6 progressive brackets: 0%, 15%, 20%, 25%, 30%, 35%
- Applied AFTER mandatory contributions are deducted
- Semi-monthly and monthly tables included

#### Payroll Processing Flow
```
1. DRAFT → HR/Admin computes payroll for cutoff period
          ↓
2. APPROVED → Cash advance balances updated, records locked
          ↓
3. RELEASED → Final state, payment processed
```

**Approval Requirements:** `hasRole("ADMIN", "HR")` middleware

#### Cash Advance Integration
- Deducted automatically during payroll computation
- Formula: `min(deductionPerCutoff, remainingBalance)`
- Balances updated when payroll transitions Draft → Approved
- Auto-marked "Fully_Paid" when balance reaches zero

#### Leave Impact on Payroll
| Leave Type | Treatment |
|------------|-----------|
| isPaid = true | Included in gross, NOT deducted |
| isPaid = false | Deducted at daily rate from net pay |

### Missing Payroll Features
- ❌ Night Differential (not implemented)
- ❌ 13th Month Pay (not implemented)
- ❌ Holiday Pay (only via OT multiplier)
- ⚠️ Late Grace Period (configured but NOT enforced in calculator)

---

## 1.2 Geofencing & Attendance Module

### GPS Verification Logic

**File:** `/server/utils/geo.ts`

#### Distance Calculation - Haversine Formula
```typescript
const R = 6371e3; // Earth's radius in meters
const a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2);
const c = 2 × atan2(√a, √(1-a));
distance = R × c; // Returns meters
```

#### In-Range Verification
```typescript
isWithinRadius = distance <= project.geoRadius;
```

### Geofence Configuration
| Setting | Value | Location |
|---------|-------|----------|
| Default Radius | 100 meters | `server/config/index.ts` |
| Per-Project Radius | Customizable | `projects.geoRadius` field |
| Coordinate Precision | 7 decimal places (~1.1cm) | Database schema |

### Verification Statuses

| Status | Trigger | Consequence |
|--------|---------|-------------|
| **Verified** | `distance ≤ geoRadius` | Clock-in accepted |
| **Off-site** | `distance > geoRadius` for ALL projects | **Clock-in REJECTED** |
| **Pending** | Employee adds justification | Awaiting HR review |
| **Flagged** | Set manually by HR/Admin | Under investigation |

### What Happens When Out of Range?
```json
{
  "message": "You are not within any assigned project site. Nearest site is 150m away.",
  "code": "OUTSIDE_GEOFENCE",
  "distance": 150
}
```
**Result:** HTTP 400 error, NO attendance record created

### Clock-In Flow (Complete)
1. Validate QR token → Find employee
2. Detect shift type (day: 06:00-21:59, night: 22:00-05:59)
3. Check for duplicate clock-in
4. Verify active project assignment exists
5. **GEOFENCE CHECK** → Loop all assigned projects, verify within radius
6. Calculate tardiness (15-min grace period)
7. Create attendance log with all captured data

### Location Sources
| Source | Validation | Geofence Check |
|--------|------------|----------------|
| GPS | Accuracy ≤ 50m required | YES - mandatory |
| IP | Schema defined only | NOT implemented |
| Manual | Admin/HR only | NO - bypassed |

---

## 1.3 QR & Photo Proof Module

### QR Code Handling

#### Generation
**Library:** `qrcode` v1.5.4
**Token:** 32-character hex string (128-bit, cryptographic random)
**Data Format:**
```json
{
  "token": "<32-char-hex>",
  "name": "FirstName LastName",
  "employeeNo": "EMP001"
}
```

#### Scanning
**Library:** `html5-qrcode` v2.3.8
**Camera:** Rear-facing (`environment`)
**FPS:** 10 frames/second
**Endpoints:**
- `GET /api/employees/:id/qr-code` → Base64 data URL
- `GET /api/employees/:id/qr-code/download` → PNG file

### Photo/Camera Integration

#### Camera Library
**Method:** Native `navigator.mediaDevices.getUserMedia()`
**Resolution:** 640×480 pixels
**Facing:** Front camera (`user`) for selfie

#### Photo Storage
| Aspect | Value |
|--------|-------|
| Format | JPEG, 80% quality |
| Storage | Base64 in PostgreSQL TEXT field |
| Location | `attendanceLogs.photo_snapshot_url` |
| Size | ~40-60 KB per photo |

**⚠️ Warning:** Photos stored in database, not external storage. Risk of database bloat.

### Face Verification

#### Libraries
- `face-api.js` v0.22.2 (primary)
- `@vladmandic/face-api` v1.7.15 (fallback)

#### Models Loaded (from `/public/models/`)
1. **TinyFaceDetector** - Fast face detection
2. **FaceLandmark68Net** - 68 facial landmarks
3. **FaceRecognitionNet** - 128-dimension face descriptor

#### Liveness Challenges
| Challenge | Detection Method | Threshold |
|-----------|-----------------|-----------|
| Blink | Eye Aspect Ratio (EAR) | EAR < 0.2 |
| Turn Left | Head yaw from landmarks | yaw < -0.15 |
| Turn Right | Head yaw from landmarks | yaw > 0.15 |

**Timeout:** 10 seconds per challenge
**Skip Option:** Allowed with security warning logged

### Critical Gap Identified
**⚠️ Face verification runs client-side but result is NOT sent to server.**
- `faceVerified` field exists but always remains `false`
- No face descriptor stored for matching
- Liveness check is skippable

---

## 1.4 Project Management Module

### Project Structure

**Database:** `/shared/schema.ts` (lines 159-203)

| Field | Type | Purpose |
|-------|------|---------|
| name | VARCHAR | Project name (required) |
| code | VARCHAR | Project code (e.g., PRJ-2024-001) |
| isOffice | BOOLEAN | Permanent hub vs temporary project |
| locationLat/Lng | DECIMAL(10,7) | Geofence center point |
| geoRadius | INTEGER | Geofence radius in meters |
| startDate/deadline | DATE | Project timeline |
| budget/actualCost | DECIMAL(15,2) | Financial tracking |
| status | ENUM | Planning, Active, On Hold, Completed, Cancelled |

### Office vs Project Distinction
| Rule | Office (isOffice=true) | Project (isOffice=false) |
|------|------------------------|--------------------------|
| Can have deadline | ❌ NO | ✅ YES |
| Can be "Completed" | ❌ NO | ✅ YES |
| Can be "Cancelled" | ❌ NO | ✅ YES |
| Hours tracking | All assigned employee hours | Date-bounded hours only |

### Task Management (Kanban)

**States:** Todo → In_Progress → Blocked → Done
**Priorities:** Low, Medium, High, Critical

| Field | Purpose |
|-------|---------|
| projectId | Required link to project |
| assignedToId | Optional employee assignment |
| status | Kanban column placement |
| priority | Badge color coding |
| dueDate | Deadline tracking |
| sortOrder | Manual ordering within column |
| completionPhotoUrl | Proof of completion |

### Drag-and-Drop
**Status:** NOT implemented
**Alternative:** Dropdown menu with status transitions

### Task Comments
- Any authenticated user can comment
- Flat list (not threaded)
- Supports attachments via URL

---

# SECTION 2: HIDDEN FEATURE DISCOVERY

## 2.1 Export/Report Functions

| Feature | Endpoint | Status |
|---------|----------|--------|
| Excel Export | `xlsx` library installed | ✅ Available |
| Bulk Employee Import | `POST /api/employees/bulk-upload` | ✅ Active |
| Employee Template | `GET /api/employees/template/download` | ✅ Active |
| Attendance Bulk Import | `POST /api/attendance/bulk-upload` | ✅ Active |
| Attendance Template | `GET /api/attendance/template/download` | ✅ Active |
| QR Code Download | `GET /api/employees/:id/qr-code/download` | ✅ Active |

## 2.2 Admin/System Features

| Feature | Location | Status |
|---------|----------|--------|
| **Audit Logs** | `GET /api/audit-logs` | ✅ Active |
| Permission Management | `GET /api/v1/permissions` | ✅ Active |
| System Accounts (Hidden) | `GET /employees/system-accounts` | ✅ Active |
| Permission Seeder | `/server/seed-permissions.ts` | ✅ Available |
| Superadmin Seeder | `/server/seed-superadmin.ts` | ✅ Available |
| Soft Delete Utilities | `/server/utils/soft-delete.ts` | ✅ Available |

## 2.3 Password/Auth Features

| Feature | Endpoint | Status |
|---------|----------|--------|
| CSRF Token Refresh | `GET /api/auth/csrf-token` | ✅ Active |
| Session Management | PostgreSQL-backed, 7-day TTL | ✅ Active |
| Replit OAuth | OpenID Connect integration | ✅ Active |
| Password Reset | Via `SUPERADMIN_PASSWORD` env var | ⚠️ Bootstrap only |

## 2.4 Health & Monitoring

| Feature | Endpoint | Purpose |
|---------|----------|---------|
| Health Check | `GET /api/health` | Overall system status |
| Readiness Probe | `GET /api/health/ready` | Kubernetes ready check |
| Liveness Probe | `GET /api/health/live` | Kubernetes live check |
| Sentry Integration | Error tracking | ✅ Active (optional) |

## 2.5 Dormant/Incomplete Code

| Feature | Evidence | Status |
|---------|----------|--------|
| **Yearly Theme (Devotionals)** | Tests removed, schema preserved | 🚫 Deprecated |
| **Leaflet Maps** | Package installed, not imported | 💤 Dormant |
| **IP-based Location** | Schema field exists, no logic | 💤 Unimplemented |
| **Face Enrollment** | Detection works, no storage | ⚠️ Incomplete |
| **API v1 Deprecation** | Headers set for 2027-01-01 sunset | ⏰ Planned |

## 2.6 Devotional System (Spiritual Wellness)

| Feature | Endpoint | Purpose |
|---------|----------|---------|
| Daily Devotionals | `GET /api/devotionals` | View today's reading |
| Admin Management | `GET /api/devotionals/admin/all` | CRUD devotionals |
| Progress Tracking | Employee reading completion | Per-employee tracking |
| Reading Logs | Detailed engagement history | Audit trail |

---

# SECTION 3: BUSINESS LOGIC TRUTH TABLE

## 3.1 Attendance Rules

| Condition | Action | Outcome |
|-----------|--------|---------|
| Clock-in within geofence | Accept | verificationStatus = "Verified" |
| Clock-in outside ALL geofences | **REJECT** | Error 400, no record created |
| No active project assignment | **REJECT** | Error: "No active assignment" |
| Already clocked in (no timeOut) | **REJECT** | Error: "Already clocked in" |
| Completed shift + clock-in again | Accept as OT | isOvertimeSession = true |
| Clock-in 22:00-05:59 | Auto-detect night shift | actualShiftType = "night" |
| Late < 15 minutes | Record but non-deductible | lateDeductible = false |
| Late ≥ 15 minutes | Record and deductible | lateDeductible = true |
| Worked ≥ 5 hours | Apply lunch deduction | lunchDeductionMinutes = 60 |
| Worked < 5 hours | No lunch deduction | lunchDeductionMinutes = 0 |
| Gross minutes > scheduled shift | Calculate overtime | overtimeMinutes = excess |
| Any overtime detected | Requires approval | otStatus = "Pending" |

## 3.2 Leave Request Rules

| Condition | Actor | Outcome |
|-----------|-------|---------|
| Submit leave request | Employee | status = "Pending" |
| Approve pending request | HR/ADMIN only | status = "Approved", allocation updated |
| Reject pending request | HR/ADMIN only | status = "Rejected", requires remarks |
| Cancel own pending request | Employee | status = "Cancelled" |
| Cancel own approved request | Employee | **REJECTED** - contact HR |
| Cancel others' request | Non-admin | **REJECTED** - forbidden |
| Annual accrual mode | System | Full allocation available Day 1 |
| Monthly accrual mode | System | `(total/12) × completedMonths` |
| Pro-rate new hire | System | `(annual/12) × remainingMonths` |

## 3.3 Payroll Rules

| Condition | Action | Outcome |
|-----------|--------|---------|
| Employee status = Active/Probationary | Include in payroll | Computed in batch |
| Employee status = Terminated/Suspended | **EXCLUDE** | Not computed |
| OT status = "Approved" | Include in pay | Added to gross with multiplier |
| OT status = "Pending" or "Rejected" | **EXCLUDE** from pay | Not added to gross |
| Leave isPaid = false | Deduct from pay | `days × dailyRate` deducted |
| Cash advance disbursed + balance > 0 | Deduct from pay | `min(perCutoff, remaining)` |
| Payroll status = "Draft" | Allow full editing | Can delete, modify |
| Draft → Approved | Update CA balances | Lock major changes |
| Approved → Released | Final state | Payment processed |

## 3.4 Permission Rules

| Condition | Result |
|-----------|--------|
| User has isSuperadmin role | Bypass ALL permission checks |
| User has roleId | Load role permissions |
| User has individual grant | Merge with role permissions |
| Permission has expiresAt set | Include only if not expired |
| Cache age > 5 minutes | Reload from database |

## 3.5 Disciplinary (NTE) Rules

| Condition | Actor | Outcome |
|-----------|-------|---------|
| Issue NTE | HR/ADMIN | status = "Issued", deadline = today + 5 days |
| Submit explanation | Employee (self) | status = "Explanation_Received" |
| Resolve with decision | HR/ADMIN | status = "Resolved", sanction recorded |
| View all NTEs | HR/ADMIN | Full access |
| View NTEs | Regular employee | Own records only |

## 3.6 Cash Advance Rules

| Condition | Actor | Outcome |
|-----------|-------|---------|
| Submit request | Employee | status = "Pending" |
| Approve with deduction schedule | HR/ADMIN | status = "Approved" |
| deductionPerCutoff > amount | System | **REJECTED** - invalid |
| Disburse approved advance | HR/ADMIN | status = "Disbursed" |
| remainingBalance = 0 after deduction | System | Auto-mark "Fully_Paid" |
| Reject pending advance | HR/ADMIN | status = "Rejected" |

---

# SECTION 4: THIRD-PARTY DEPENDENCY LIST

## 4.1 External Services (Requires Billing/Accounts)

| Service | Package | Required | Configuration |
|---------|---------|----------|---------------|
| **PostgreSQL** | `pg` ^8.16.3 | ✅ REQUIRED | `DATABASE_URL` |
| **Sentry** | `@sentry/node` ^8.0.0 | Optional | `SENTRY_DSN` |
| **Replit Auth** | `openid-client` ^6.8.1 | If on Replit | Auto-configured |

**NOT integrated:** Payment processors, Email (SendGrid/Mailgun), SMS (Twilio), Cloud Storage (S3/GCS)

## 4.2 Critical Backend Dependencies

| Package | Version | Feature |
|---------|---------|---------|
| `drizzle-orm` | ^0.39.3 | PostgreSQL ORM |
| `bcrypt` | ^6.0.0 | Password hashing (12 rounds) |
| `passport` | ^0.7.0 | Authentication |
| `express-session` | ^1.18.2 | Session management |
| `helmet` | ^8.1.0 | Security headers |
| `express-rate-limit` | ^8.2.1 | Rate limiting |
| `xlsx` | ^0.18.5 | Excel/CSV processing |
| `qrcode` | ^1.5.4 | QR generation |
| `zod` | ^3.24.2 | Schema validation |

## 4.3 Frontend UI Libraries

| Package | Version | Feature |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `@tanstack/react-query` | ^5.60.5 | Server state |
| `react-hook-form` | ^7.55.0 | Form handling |
| `recharts` | ^2.15.2 | Charts |
| `html5-qrcode` | ^2.3.8 | QR scanning |
| `face-api.js` | ^0.22.2 | Face detection |
| `date-fns` | ^3.6.0 | Date utilities |
| `wouter` | ^3.3.5 | Routing |

## 4.4 Radix UI Components (20 packages)

All `@radix-ui/react-*` packages for:
- Dialog, Dropdown, Select, Tabs
- Accordion, Toast, Tooltip, Popover
- Checkbox, Radio, Switch, Slider
- And 8 more component primitives

## 4.5 Development Tools

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.6.3 | Type checking |
| `vite` | ^7.3.0 | Build tool |
| `vitest` | ^1.6.1 | Testing |
| `tailwindcss` | ^3.4.17 | CSS framework |
| `drizzle-kit` | ^0.31.8 | DB migrations |

## 4.6 Unused/Dormant Dependencies

| Package | Status | Notes |
|---------|--------|-------|
| `leaflet` + `react-leaflet` | 💤 Installed, not imported | Maps capability ready |
| `@vladmandic/face-api` | 💤 Fallback only | Alternative face-api |
| `ws` (WebSocket) | 💤 Imported, no active use | Real-time ready |

## 4.7 Environment Variables Summary

```bash
# REQUIRED
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=<32+ char secret>

# OPTIONAL
SENTRY_DSN=<sentry project DSN>
NODE_ENV=production
PORT=5000
```

---

# SUMMARY STATISTICS

| Metric | Value |
|--------|-------|
| Total Lines of Code | 57,534 |
| TypeScript Files | 216 |
| Backend Route Files | 21 |
| Frontend Pages | 23 |
| UI Components | 63 |
| Database Tables | 40+ |
| API Endpoints | ~149 |
| Test Files | 23 |
| npm Dependencies | 103 |
| External Services Required | 1 (PostgreSQL) |

---

# RECOMMENDATIONS

## Critical (Fix Immediately)
1. **Face verification not integrated** - Results not sent to server
2. **Photo storage in database** - Move to cloud storage (S3/GCS)
3. **Liveness check skippable** - Make mandatory or flag records

## High Priority
1. Implement Night Differential calculation
2. Add 13th Month Pay computation
3. Enforce late grace period in payroll calculator
4. Add face descriptor storage for matching

## Medium Priority
1. Implement drag-and-drop for Kanban
2. Add calendar/timeline view for projects
3. Create notification system (email/in-app)
4. Add photo retention/cleanup policy

## Low Priority
1. Activate Leaflet maps for geofence visualization
2. Add WebSocket for real-time updates
3. Implement IP-based location fallback
4. Add threaded comments for tasks

---

*Report generated by Deep Feature Audit - ElectroManage ERP*
