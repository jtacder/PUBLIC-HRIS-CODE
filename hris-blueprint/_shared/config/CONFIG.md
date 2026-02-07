# Configuration Reference

## Overview

The HRIS system uses a centralized configuration pattern with Zod-validated environment variables, structured constants, and tool-specific configuration files. All configuration is validated at startup -- if any required variable is missing or invalid, the server fails fast with a descriptive error message.

---

## 1. Server Configuration (`server/config/index.ts`)

Centralized configuration module with Zod validation. Application exits with clear error if required env vars are missing.

### Environment Validation Schema

```typescript
import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),

  // Server
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Session
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),

  // Optional
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// Validate at startup -- fail fast
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
```

### Application Constants

Business-logic constants that do not change between environments. These are hardcoded in the configuration file, not sourced from environment variables.

| Constant | Value | Location |
|----------|-------|----------|
| Timezone | UTC+8 (Asia/Manila) | `config.timezone` |
| Working Days/Month | 22 | `config.payroll.workingDaysPerMonth` |
| Hours/Day | 8 | `config.payroll.hoursPerDay` |
| OT Rate Multiplier | 1.25 | `config.payroll.otRateMultiplier` |
| Regular Holiday Rate | 2.0 | `config.payroll.regularHolidayRate` |
| Special Holiday Rate | 1.3 | `config.payroll.specialHolidayRate` |
| Rest Day Rate | 1.3 | `config.payroll.restDayRate` |
| Night Diff Rate | 0.1 | `config.payroll.nightDiffRate` |
| Grace Period | 15 minutes | `config.attendance.gracePeriodMinutes` |
| Lunch Break | 60 minutes | `config.attendance.lunchBreakMinutes` |
| Default Geofence Radius | 100 meters | `config.geofence.defaultRadiusMeters` |
| Earth Radius | 6,371,000 meters | `config.geofence.earthRadiusMeters` |
| Session TTL | 7 days (604,800,000 ms) | `config.session.ttl` |
| Bcrypt Salt Rounds | 12 | `config.bcrypt.saltRounds` |
| QR Token Bytes | 16 (32 hex chars) | `config.qr.tokenBytes` |
| Max File Size | 10 MB | `config.upload.maxFileSizeMB` |
| PhilHealth Rate | 5% | `config.government.philhealthRate` |
| Pag-IBIG Employee Rate | 2% | `config.government.pagibigEmployeeRate` |
| Pag-IBIG Max Contribution | 200/month | `config.government.pagibigMaxContribution` |

### Config Object Structure

```typescript
export const config = {
  timezone: {
    name: "Asia/Manila",
    offsetHours: 8,
  },
  payroll: {
    workingDaysPerMonth: 22,
    hoursPerDay: 8,
    otRateMultiplier: 1.25,
    regularHolidayRate: 2.0,
    specialHolidayRate: 1.3,
    restDayRate: 1.3,
    nightDiffRate: 0.1,
  },
  attendance: {
    gracePeriodMinutes: 15,
    lunchBreakMinutes: 60,
  },
  geofence: {
    defaultRadiusMeters: 100,
    earthRadiusMeters: 6_371_000,
  },
  session: {
    ttlDays: 7,
    ttlMs: 7 * 24 * 60 * 60 * 1000,
  },
  bcrypt: {
    saltRounds: 12,
  },
  qr: {
    tokenBytes: 16,
  },
  upload: {
    maxFileSizeMB: 10,
    allowedDocumentTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
  },
  rateLimits: {
    global: 1000,          // per 15-minute window
    auth: 10,              // per 15-minute window
    password: 3,           // per hour
    write: 60,             // per minute
  },
  government: {
    sssTableVersion: "2024",
    philhealthRate: 0.05,
    pagibigEmployeeRate: 0.02,
    pagibigMaxContribution: 200,
  },
};
```

---

## 2. Shadcn/UI Configuration (`components.json`)

Located at the project root, this file configures how `npx shadcn@latest add` generates components.

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "hooks": "@/hooks"
  }
}
```

| Setting | Value | Description |
|---------|-------|-------------|
| `style` | `new-york` | Component visual style (vs. default) -- tighter spacing, smaller radii |
| `rsc` | `false` | Not using React Server Components (this is a Vite SPA) |
| `tsx` | `true` | Components use TypeScript JSX |
| `baseColor` | `neutral` | Gray scale base (not slate, zinc, stone, or gray) |
| `cssVariables` | `true` | Use HSL CSS variables for theming (enables dark mode) |

---

## 3. Tailwind CSS Configuration (`tailwind.config.ts`)

```typescript
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  // Dark mode via class on <html> element (toggled by next-themes)
  darkMode: "class",

  content: [
    "./client/src/**/*.{ts,tsx}",
    "./client/index.html",
  ],

  theme: {
    extend: {
      // HSL color system for light/dark mode
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },

  plugins: [
    tailwindcssAnimate,   // Animation utilities (animate-in, animate-out, fade-in, etc.)
    typography,           // Prose styling for rendered markdown/rich text
  ],
} satisfies Config;
```

**Key Design Decisions:**

| Decision | Rationale |
|----------|-----------|
| `darkMode: "class"` | Allows programmatic dark mode toggle via `next-themes` rather than relying on system preference alone |
| HSL color variables | Enables runtime theme switching without rebuilding CSS; same variable names, different values per theme |
| `tailwindcss-animate` | Required by Shadcn/UI for enter/exit animations on Dialog, Sheet, Toast, etc. |
| `@tailwindcss/typography` | Used for rendering rich text descriptions with proper typographic styles |

---

## 4. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    },
    "baseUrl": "."
  },
  "include": [
    "client/src/**/*",
    "shared/**/*",
    "server/**/*"
  ]
}
```

**Path Aliases:**

| Alias | Maps To | Example Import |
|-------|---------|----------------|
| `@/*` | `./client/src/*` | `import { Button } from "@/components/ui/button"` |
| `@shared/*` | `./shared/*` | `import { Employee } from "@shared/schema"` |

---

## 5. Vite Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "client",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@/components": path.resolve(__dirname, "client/src/components"),
      "@/hooks": path.resolve(__dirname, "client/src/hooks"),
      "@/lib": path.resolve(__dirname, "client/src/lib"),
      "@/pages": path.resolve(__dirname, "client/src/pages"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});
```

**Key Settings:**

| Setting | Value | Purpose |
|---------|-------|---------|
| `root` | `"client"` | Vite serves from the `client/` directory |
| `resolve.alias` | `@/` prefix | Matches TypeScript path aliases for bundler resolution |
| `server.proxy` | `/api` to `:5000` | Proxies API calls to Express during development |
| `build.outDir` | `../dist/public` | Production build output for Express static serving |

---

## 6. Drizzle ORM Configuration (`drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 7. Database Connection (`server/db.ts`)

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum pool connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Timeout new connections after 5s
});

export const db = drizzle(pool, { schema });
```

---

## Configuration File Locations Summary

| File | Location | Purpose |
|------|----------|---------|
| `server/config/index.ts` | Server | Zod-validated env vars + business constants |
| `components.json` | Root | Shadcn/UI component generation settings |
| `tailwind.config.ts` | Root | Tailwind CSS theme, plugins, content paths |
| `tsconfig.json` | Root | TypeScript compiler options and path aliases |
| `vite.config.ts` | Root | Vite build tool, dev server proxy, path aliases |
| `drizzle.config.ts` | Root | Drizzle ORM migration settings |
| `server/db.ts` | Server | PostgreSQL connection pool via `pg` |
| `.env` | Root (gitignored) | Environment variables (DATABASE_URL, SESSION_SECRET, etc.) |

---

## Scholaris Configuration Changes

When adapting this configuration for the Scholaris School Management System:

| Area | ElectroManage (Current) | Scholaris (Adapted) |
|------|------------------------|---------------------|
| Routing | Wouter (client SPA) | Next.js App Router |
| Build Tool | Vite (`vite.config.ts`) | Next.js (`next.config.ts`) |
| Session Store | connect-pg-simple | Supabase Auth |
| Database Client | Drizzle ORM + `pg` Pool | Supabase Client + Drizzle ORM |
| Auth Strategy | Passport.js local strategy | Supabase Auth (JWT) |
| Tailwind Content Paths | `client/src/**/*.{ts,tsx}` | `app/**/*.{ts,tsx}`, `components/**/*.{ts,tsx}` |
| RSC Setting | `rsc: false` | `rsc: true` |
| Additional Constants | Philippine payroll rates | Academic year, semester, grading scales |

**Scholaris-specific constants to add:**
```typescript
export const scholaris = {
  academic: {
    defaultSchoolYear: "2026-2027",
    defaultSemester: 1,
    maxUnitsPerSemester: 30,
    passingGrade: 75,
  },
  grading: {
    scale: [
      { min: 97, max: 100, equivalent: 1.0 },
      { min: 94, max: 96, equivalent: 1.25 },
      { min: 91, max: 93, equivalent: 1.5 },
      { min: 88, max: 90, equivalent: 1.75 },
      { min: 85, max: 87, equivalent: 2.0 },
      { min: 82, max: 84, equivalent: 2.25 },
      { min: 79, max: 81, equivalent: 2.5 },
      { min: 76, max: 78, equivalent: 2.75 },
      { min: 75, max: 75, equivalent: 3.0 },
      { min: 0, max: 74, equivalent: 5.0 },
    ],
  },
};
```
