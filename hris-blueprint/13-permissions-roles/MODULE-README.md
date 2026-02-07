# Module 13: Permissions & Roles

## Purpose

Role-based access control (RBAC) system that governs authorization across the entire HRIS. Defines four core roles (ADMIN, HR, ENGINEER, WORKER) with a superadmin bypass, supports individual permission grants that override role defaults, and includes permission expiry for temporary access. The module provides server-side middleware for route protection and client-side hooks for conditional UI rendering.

**Critical Security Note:** Client-side role checks (e.g., hiding menu items for non-admin users) are a UX convenience only. All actual authorization is enforced server-side via Express middleware. Never rely on client-side guards for security.

## File Inventory

| File | Original Path | Layer | Description |
|------|--------------|-------|-------------|
| seed-superadmin.ts | server/seed-superadmin.ts | Backend | Seeds the initial superadmin user on first startup |
| seed-permissions.ts | server/seed-permissions.ts | Backend | Seeds the default permission definitions into the database |
| email-auth.ts | server/email-auth.ts | Backend | Authentication middleware: isAuthenticated, hasRole, session management |
| useAuth hook | client/src/hooks/use-auth.tsx | Frontend | React hook providing user, isAdmin, role, login/logout functions |
| App.tsx (partial) | client/src/App.tsx | Frontend | Role-based route rendering and protected route wrappers |

## Key Features

- **Four Core Roles**: ADMIN (full access), HR (employee/payroll management), ENGINEER (project/task access), WORKER (self-service only)
- **Superadmin Bypass**: A designated superadmin account bypasses ALL permission checks unconditionally
- **Individual Permission Grants**: Override role defaults by granting or revoking specific permissions per user
- **Permission Expiry**: Temporary permissions with an `expires_at` timestamp that are automatically invalidated
- **5-Minute Cache TTL**: Permission lookups are cached for 5 minutes to reduce database queries
- **Session-Based Auth**: Passport.js with local strategy, bcrypt password hashing, express-session with PostgreSQL store
- **Middleware Stack**: `isAuthenticated` (session check) -> `hasRole("ADMIN", "HR")` (role check) -> route handler
- **Client-Side Hook**: `useAuth()` returns `{ user, isAdmin, isHR, login, logout, isLoading }` for conditional rendering

## API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/v1/permissions | ADMIN | List all defined permissions with user grant counts |
| POST | /api/auth/login | Public | Authenticate with email/password, create session |
| POST | /api/auth/logout | Authenticated | Destroy session and clear cookie |
| GET | /api/auth/me | Authenticated | Get current user session data |

## Dependencies

### Internal Module Dependencies
- **_shared/components/ui/*** -- UI components used across all protected pages
- **02-employee-management** -- Employee role field maps to system roles
- **12-audit-trail** -- Permission changes are logged

### External Libraries
- **Passport.js** (v0.7.0) -- Authentication framework with local strategy
- **bcrypt** (v5.1.1) -- Password hashing (salt rounds: 10)
- **express-session** (v1.18.1) -- Session management
- **connect-pg-simple** (v10.0.0) -- PostgreSQL session store
- **Zod** -- Request validation for login/permission endpoints

## Database Tables

| Table | Owned | Description |
|-------|-------|-------------|
| roles | Yes | Role definitions (ADMIN, HR, ENGINEER, WORKER) |
| permissions | Yes | Permission definitions with module + action granularity |
| user_permissions | Yes | Per-user permission overrides with optional expiry |
| users | Shared | Core user accounts (owned by auth system, referenced here) |
| session | Shared | Express session storage (managed by connect-pg-simple) |

## Role Hierarchy and Default Access

| Module/Feature | ADMIN | HR | ENGINEER | WORKER |
|----------------|-------|----|----------|--------|
| Dashboard (full) | Yes | Yes | No | No |
| Dashboard (personal) | Yes | Yes | Yes | Yes |
| Employee Management | Full CRUD | Full CRUD | Read (project team) | Read (self) |
| Schedule Management | Full CRUD | Full CRUD | Read | Read (self) |
| Attendance | Full CRUD | Full CRUD | Read (project team) | Read (self) |
| 201 Files | Full CRUD | Full CRUD | No | Read (self) |
| Leave Management | Full CRUD | Full CRUD | Read (self) | Read (self) |
| Loans/Cash Advance | Full CRUD | Full CRUD | Read (self) | Read (self) |
| Payroll | Full CRUD | Full CRUD | No | Read (self payslip) |
| Disciplinary | Full CRUD | Full CRUD | No | Read (self) |
| HR Settings | Full CRUD | Read | No | No |
| Devotionals | Full CRUD | Full CRUD | Read | Read |
| Audit Trail | Read | No | No | No |
| Permissions | Full CRUD | No | No | No |
| Projects | Full CRUD | Read | Read/Update (assigned) | Read (assigned) |
| Tasks | Full CRUD | Read | Read/Update (assigned) | Read/Update (assigned) |
| Expenses | Full CRUD | Approve | Submit/Read (self) | Submit/Read (self) |

## Business Logic Rules

| Rule | Description |
|------|-------------|
| Superadmin bypass | If `user.is_superadmin === true`, skip all permission checks |
| Role inheritance | Roles have implicit permissions; individual grants override these |
| Permission caching | Permission lookups are cached per user for 5 minutes (TTL) |
| Session duration | Sessions expire after 24 hours of inactivity (configurable) |
| Password hashing | bcrypt with 10 salt rounds; plaintext passwords never stored |
| Cookie security | `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'` |
| Expired permissions | Permissions with `expires_at < NOW()` are treated as revoked |
| Login throttling | Not implemented (noted as technical debt) |

## Authentication Flow

```
1. User submits email + password to POST /api/auth/login
2. Passport local strategy finds user by email
3. bcrypt.compare(password, user.password_hash) validates credentials
4. On success: session created, user data returned (sans password)
5. Subsequent requests: express-session reads cookie, attaches req.user
6. Protected routes: isAuthenticated middleware checks req.isAuthenticated()
7. Role-restricted routes: hasRole("ADMIN", "HR") checks req.user.role
8. On logout: session destroyed, cookie cleared
```

## Technical Debt

| Issue | Description |
|-------|-------------|
| No login throttling | No rate limiting on failed login attempts (brute force risk) |
| No password reset | No forgot-password or reset-password flow implemented |
| No 2FA/MFA | No two-factor authentication support |
| Cache invalidation | 5-minute cache means permission changes take up to 5 minutes to propagate |
| No permission UI | No admin UI for managing individual permission grants (API-only) |

## Scholaris Adaptation Notes

- **Expand role types**: Add Registrar, Cashier, Faculty, Parent, Student roles beyond the four HRIS roles
- **Department-scoped permissions**: Faculty may need permissions scoped to their department/grade level
- **Parent-child linking**: Parents need permissions scoped to their children's data only
- **Student self-service**: Students get read-only access to their own grades, schedule, and balance
- **Academic year context**: Permissions may need to be scoped to the current academic year
- **Multi-campus support**: If multi-campus, permissions may need campus-level scoping
- **SSO integration**: Schools may need Google Workspace or Microsoft 365 SSO via OAuth2/SAML
- **Bulk role assignment**: Assign roles to entire sections/classes of students or groups of faculty
