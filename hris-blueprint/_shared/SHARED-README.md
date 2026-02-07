# Shared Infrastructure (`_shared/`)

## Purpose

The `_shared/` directory contains all cross-cutting infrastructure used by every module in the HRIS system. This includes the UI component library, authentication hooks, utility functions, database client setup, middleware chain, state management configuration, TypeScript type definitions, and application constants. No module functions independently without this shared foundation.

## Directory Structure

```
_shared/
├── SHARED-README.md              # This file
├── components/
│   ├── COMPONENTS.md             # Component documentation
│   └── ui/                       # 40+ Shadcn/UI primitives
│       ├── accordion.tsx
│       ├── alert.tsx
│       ├── alert-dialog.tsx
│       ├── aspect-ratio.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── button.tsx
│       ├── calendar.tsx
│       ├── card.tsx
│       ├── carousel.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── command.tsx            # cmdk-based command palette
│       ├── context-menu.tsx
│       ├── date-picker.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── form.tsx
│       ├── hover-card.tsx
│       ├── input.tsx
│       ├── input-otp.tsx
│       ├── label.tsx
│       ├── menubar.tsx
│       ├── navigation-menu.tsx
│       ├── popover.tsx
│       ├── progress.tsx
│       ├── radio-group.tsx
│       ├── resizable.tsx          # react-resizable-panels
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sheet.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── switch.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── textarea.tsx
│       ├── toast.tsx
│       ├── toaster.tsx
│       ├── toggle.tsx
│       ├── toggle-group.tsx
│       └── tooltip.tsx
│   ├── sidebar.tsx                # Role-based navigation sidebar
│   ├── searchable-employee-select.tsx  # cmdk-powered employee picker
│   └── theme-toggle.tsx           # Dark/light mode toggle
├── hooks/
│   ├── HOOKS.md                   # Hooks documentation
│   ├── use-auth.ts                # Authentication state hook
│   ├── use-toast.ts               # Toast notification hook
│   └── use-mobile.tsx             # Viewport detection hook
├── lib/
│   ├── LIB.md                     # Library documentation
│   ├── queryClient.ts             # TanStack React Query configuration
│   ├── utils.ts                   # cn() utility and helper functions
│   └── auth.ts                    # Auth client utilities for API calls
├── types/
│   ├── TYPES.md                   # Type documentation
│   └── (Drizzle-inferred types from shared/schema.ts)
├── middleware/
│   ├── MIDDLEWARE.md               # Middleware documentation
│   ├── security.ts                 # Helmet, rate limiting, input sanitization
│   └── error-handler.ts           # AppError classes, asyncHandler, globalErrorHandler
├── stores/
│   └── STORES.md                  # State management documentation
├── config/
│   ├── CONFIG.md                  # Configuration documentation
│   ├── env-variables.md           # Environment variable reference
│   └── (server/config/index.ts)   # Centralized config with Zod validation
└── database/
    └── complete-schema.sql        # Full PostgreSQL schema (40+ tables)
```

## Shared Components

### Shadcn/UI Component Library (40+ components)

All Shadcn/UI components live in `client/src/components/ui/` and are configured via `components.json` in the project root. They use the **New York** style variant with **neutral** base color, HSL CSS variables for theming, and Tailwind CSS for styling.

| Category | Components |
|----------|-----------|
| **Form** | button, input, textarea, select, checkbox, radio-group, switch, slider, label, form |
| **Display** | badge, avatar, alert, card, table, separator, progress, aspect-ratio |
| **Navigation** | tabs, accordion, breadcrumb, navigation-menu, menubar |
| **Overlay** | dialog, popover, tooltip, hover-card, dropdown-menu, context-menu, alert-dialog, sheet |
| **Feedback** | toast, toaster, sonner |
| **Data Entry** | calendar, date-picker, input-otp, command (cmdk) |
| **Layout** | scroll-area, resizable-panels, collapsible, carousel |
| **Toggle** | toggle, toggle-group |

### Custom Components (3)

| Component | File | Purpose |
|-----------|------|---------|
| Sidebar | `sidebar.tsx` | Role-based navigation with menu items filtered by user role (ADMIN, HR, ENGINEER, WORKER) |
| Searchable Employee Select | `searchable-employee-select.tsx` | Searchable dropdown for selecting employees, built on cmdk Command component with keyboard navigation and screen reader support |
| Theme Toggle | `theme-toggle.tsx` | Dark/light mode toggle using next-themes |

## Shared Hooks

| Hook | File | Returns | Purpose |
|------|------|---------|---------|
| `useAuth()` | `use-auth.ts` | `{ user, isAdmin, isAuthenticated, login, logout }` | Authentication state via TanStack Query fetching `/api/auth/me` |
| `useToast()` | `use-toast.ts` | `{ toast, dismiss }` | Toast notification triggers wrapping Radix UI toast primitives |
| `useMobile()` | `use-mobile.tsx` | `{ isMobile: boolean }` | Viewport width detection for responsive behavior |

## Utility Libraries

| File | Exports | Purpose |
|------|---------|---------|
| `queryClient.ts` | `queryClient` | TanStack React Query client with default staleTime, cacheTime, and retry logic |
| `utils.ts` | `cn()` | Class name utility combining `clsx` + `tailwind-merge` for conditional Tailwind classes |
| `auth.ts` | Auth helpers | Client-side utilities for authentication API calls |

## Database Client Setup

The database connection is established in `server/db.ts` using **Drizzle ORM** with the `pg` (node-postgres) driver. The connection string comes from the `DATABASE_URL` environment variable. The schema is defined in `shared/schema.ts` (700+ lines, 40+ tables) and generates TypeScript types via `drizzle-zod`.

```
shared/schema.ts  -->  Drizzle ORM  -->  PostgreSQL
                       (server/db.ts)
```

## Middleware Chain

The Express middleware stack is applied in order in `server/index.ts`:

1. **Helmet.js** -- HTTP security headers (CSP, HSTS, X-Content-Type-Options)
2. **Rate Limiting** -- 4 tiers: global (1000/15min), auth (10/15min), password (3/hr), write (60/min)
3. **Input Sanitization** -- Null byte removal, control character filtering, content-type validation
4. **Session Management** -- express-session with PostgreSQL store (connect-pg-simple), 7-day TTL
5. **Authentication** -- Passport.js with local strategy, bcrypt (12 salt rounds)
6. **Error Handler** -- AppError class hierarchy, asyncHandler wrapper, global error handler

## State Management (TanStack Query)

TanStack React Query v5 is the primary state management solution. There is no Zustand, Redux, or other client-side store.

**Pattern:**
- All server data is fetched via `useQuery` hooks with structured query keys
- Mutations use `useMutation` with `onSuccess` callbacks that call `queryClient.invalidateQueries()`
- The `queryClient` is configured in `client/src/lib/queryClient.ts` with default options

**Query Key Convention:**
```typescript
["/api/employees"]                    // List all employees
["/api/employees", employeeId]        // Single employee
["/api/attendance/today"]             // Today's attendance
["/api/payroll"]                      // Payroll records
["/api/auth/me"]                      // Current user session
```

## Type Definitions

TypeScript types are derived from the Drizzle ORM schema using `drizzle-zod`:

- **Select types** (read): `Employee`, `User`, `PayrollRecord`, `AttendanceLog`, etc.
- **Insert types** (write): `InsertEmployee`, `InsertUser`, `InsertPayrollRecord`, etc.
- **Enum values**: Role (`ADMIN`, `HR`, `ENGINEER`, `WORKER`), employee status, payroll status, leave status, etc.
- **Zod schemas**: Input validation schemas generated from Drizzle table definitions
- **API response types**: Typed fetch wrappers for all endpoints

## Configuration Constants

Defined in `server/config/index.ts` with Zod validation:

| Constant | Value | Description |
|----------|-------|-------------|
| Timezone | UTC+8 (Asia/Manila) | All date/time operations use Philippine timezone |
| Working days/month | 22 | Standard payroll computation basis |
| Grace period | 15 minutes | Tardiness threshold before deduction applies |
| Geofence radius | 100 meters | Default attendance check-in radius |
| Session TTL | 7 days | Authentication session lifetime |
| Bcrypt rounds | 12 | Password hashing cost factor |

## Technology Stack Summary

| Technology | Version | Role |
|-----------|---------|------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.6.3 | Type safety |
| Vite | 7.3.0 | Build tool and dev server |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| Shadcn/UI | New York style | Component primitives |
| Radix UI | Various | Accessible component primitives |
| TanStack React Query | 5.60.5 | Server state management |
| React Hook Form | 7.55.0 | Form handling |
| Zod | 3.24.2 | Schema validation |
| Wouter | 3.3.5 | Client-side routing |
| Express.js | 4.21.2 | HTTP server |
| Drizzle ORM | 0.39.3 | Database ORM |
| PostgreSQL | 14+ | Database |
| Passport.js | 0.7.0 | Authentication |
| Helmet | 8.1.0 | HTTP security headers |
| bcrypt | 6.0.0 | Password hashing |
| Recharts | 2.15.2 | Data visualization |
| Framer Motion | 11.13.1 | UI animations |
| Lucide React | 0.453.0 | Icon library |

## Cross-Module Dependency Map

Every module in the HRIS system depends on `_shared/`. The dependency flow is:

```
_shared/
├── All 18 modules depend on:
│   ├── components/ui/*         (UI primitives)
│   ├── hooks/use-auth.ts       (authentication state)
│   ├── hooks/use-toast.ts      (notifications)
│   ├── lib/queryClient.ts      (data fetching)
│   ├── lib/utils.ts            (cn() class utility)
│   ├── middleware/security.ts  (HTTP security)
│   ├── middleware/error-handler.ts (error handling)
│   └── types/                  (TypeScript types from schema)
│
├── Most modules also use:
│   ├── components/sidebar.tsx  (navigation)
│   ├── hooks/use-mobile.tsx    (responsive behavior)
│   └── config/                 (constants and env vars)
│
└── Specific modules use:
    └── components/searchable-employee-select.tsx
        (used by attendance, payroll, leave, disciplinary, tasks, projects)
```
