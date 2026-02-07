import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  SENTRY_DSN: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  EMAIL_ENABLED: z.coerce.boolean().default(false),
  RESEND_API_KEY: z.string().optional(),
  APP_URL: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  SUPERADMIN_PASSWORD: z.string().optional(),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadConfig();

export const config = {
  timezone: {
    offsetHours: 8,
    name: "Asia/Manila" as const,
  },
  payroll: {
    workingDaysPerMonth: 22,
    defaultGraceMinutes: 15,
  },
  geofence: {
    defaultRadiusMeters: 100,
  },
  session: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  bcrypt: {
    saltRounds: 12,
  },
  rateLimit: {
    global: { windowMs: 15 * 60 * 1000, max: 1000 },
    login: { windowMs: 15 * 60 * 1000, max: 10 },
    passwordChange: { windowMs: 60 * 60 * 1000, max: 3 },
    write: { windowMs: 60 * 1000, max: 60 },
  },
} as const;
