# Shared Middleware

## Overview

The HRIS Express server applies a layered middleware stack that handles HTTP security headers, rate limiting, input sanitization, content-type validation, and centralized error handling. The middleware is defined in two files and applied in order in `server/index.ts`.

**Middleware Execution Order:**
```
Request
  --> Helmet.js (security headers)
  --> Rate Limiter (request throttling)
  --> Input Sanitizer (null bytes, control chars)
  --> Content-Type Validator (POST/PUT/PATCH body checks)
  --> Express Session (connect-pg-simple)
  --> Passport.js (authentication)
  --> Route Handler
  --> Error Handler (AppError, Zod errors, unexpected)
Response
```

---

## File 1: `security.ts` -- Security Middleware

**File:** `server/middleware/security.ts`

### 1. Helmet.js -- HTTP Security Headers

Helmet sets secure HTTP response headers to protect against common web vulnerabilities.

```typescript
import helmet from "helmet";
import { Express } from "express";

export function configureHelmet(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";

  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isProduction
            ? ["'self'"]                          // Strict in production
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Relaxed for Vite HMR in dev
          styleSrc: ["'self'", "'unsafe-inline'"],  // Inline styles needed for Tailwind
          imgSrc: ["'self'", "data:", "blob:"],    // data: for QR codes, blob: for camera
          connectSrc: ["'self'", "ws:", "wss:"],   // WebSocket connections
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },

      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000,                         // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },

      // Prevent MIME type sniffing
      xContentTypeOptions: true,                  // X-Content-Type-Options: nosniff

      // XSS Protection (legacy browsers)
      xXssProtection: true,                       // X-XSS-Protection: 1; mode=block

      // Referrer Policy
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },

      // Hide Express server identifier
      xPoweredBy: false,                          // Removes X-Powered-By: Express

      // Prevent clickjacking
      frameguard: {
        action: "deny",                           // X-Frame-Options: DENY
      },
    })
  );
}
```

**Headers Set by Helmet:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | Strict directives | Prevents XSS, code injection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter for older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information leakage |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframes |
| `X-Powered-By` | (removed) | Hides Express server fingerprint |

---

### 2. Rate Limiters -- Request Throttling

Four rate limiter tiers protect against brute-force attacks and API abuse. Built using `express-rate-limit`.

```typescript
import rateLimit from "express-rate-limit";

// Tier 1: Global rate limit -- applies to all routes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15-minute window
  max: 1000,                      // 1000 requests per window per IP
  message: {
    error: "Too many requests. Please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,          // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,           // Disable X-RateLimit-* headers
});

// Tier 2: Authentication rate limit -- login and register endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15-minute window
  max: 10,                        // 10 login attempts per window per IP
  message: {
    error: "Too many login attempts. Please try again in 15 minutes.",
  },
  skipSuccessfulRequests: true,   // Only count failed attempts
});

// Tier 3: Password reset rate limit
export const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,      // 1-hour window
  max: 3,                         // 3 password reset attempts per hour per IP
  message: {
    error: "Too many password reset attempts. Please try again in 1 hour.",
  },
});

// Tier 4: Write operations rate limit -- POST, PUT, PATCH, DELETE
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,           // 1-minute window
  max: 60,                        // 60 write operations per minute per IP
  message: {
    error: "Too many write operations. Please slow down.",
  },
});
```

**Rate Limiter Application:**

```typescript
// In server/index.ts or route files
app.use(globalLimiter);                           // All routes
app.use("/api/auth/login", authLimiter);          // Login only
app.use("/api/auth/register", authLimiter);       // Register only
app.use("/api/auth/reset-password", passwordLimiter);  // Password reset only

// Write limiter applied to mutation routes
app.post("/api/*", writeLimiter);
app.put("/api/*", writeLimiter);
app.patch("/api/*", writeLimiter);
app.delete("/api/*", writeLimiter);
```

---

### 3. Input Sanitization -- Malicious Payload Prevention

Sanitizes all incoming request bodies, query parameters, and URL parameters to prevent injection attacks.

```typescript
import { Request, Response, NextFunction } from "express";

/**
 * Sanitize a single string value:
 * 1. Remove null bytes (\x00) that can bypass validation
 * 2. Remove control characters (except tab, newline, carriage return)
 */
function sanitizeString(value: string): string {
  return value
    .replace(/\x00/g, "")                        // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, "");  // Remove control chars (keep \t \n \r)
}

/**
 * Recursively sanitize all string values in an object.
 * Also removes object keys containing dangerous characters: $, {, }
 * This prevents NoSQL injection patterns like { "$gt": "" }
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip keys with dangerous characters
    if (/[${}]/.test(key)) continue;

    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string"
          ? sanitizeString(item)
          : typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : item
      );
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Express middleware that sanitizes req.body, req.query, and req.params
 */
export function inputSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query as Record<string, unknown>) as any;
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params) as any;
  }
  next();
}
```

**What Gets Sanitized:**

| Threat | Mitigation | Example |
|--------|------------|---------|
| Null byte injection | Remove `\x00` characters | `"admin\x00.jpg"` becomes `"admin.jpg"` |
| Control character injection | Remove chars `\x01-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F` | Preserves tabs, newlines, carriage returns |
| NoSQL operator injection | Remove keys containing `$`, `{`, `}` | `{ "$gt": "" }` is stripped entirely |

---

### 4. Content-Type Validation

Ensures that requests with bodies (POST, PUT, PATCH) use an expected Content-Type.

```typescript
export function contentTypeValidator(req: Request, res: Response, next: NextFunction) {
  const methodsWithBody = ["POST", "PUT", "PATCH"];

  if (methodsWithBody.includes(req.method) && req.headers["content-length"] !== "0") {
    const contentType = req.headers["content-type"] || "";
    const allowedTypes = [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
    ];

    const isAllowed = allowedTypes.some((type) => contentType.includes(type));

    if (!isAllowed && contentType !== "") {
      return res.status(415).json({
        error: "Unsupported Media Type",
        message: `Content-Type must be one of: ${allowedTypes.join(", ")}`,
      });
    }
  }

  next();
}
```

---

## File 2: `error-handler.ts` -- Error Handling Middleware

**File:** `server/middleware/error-handler.ts`

### AppError Base Class

All application errors extend from `AppError`, which carries a status code, operational flag, and optional context.

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Error Subclasses

```typescript
// 400 -- Bad Request: invalid input, validation failure
export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", context?: Record<string, unknown>) {
    super(message, 400, true, context);
  }
}

// 401 -- Unauthorized: not authenticated
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, true);
  }
}

// 403 -- Forbidden: authenticated but insufficient permissions
export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, true);
  }
}

// 404 -- Not Found: resource does not exist
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, true);
  }
}

// 409 -- Conflict: duplicate resource or state conflict
export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, true);
  }
}

// 429 -- Too Many Requests: rate limit exceeded
export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, true);
  }
}
```

### Error Class Usage in Route Handlers

```typescript
import { NotFoundError, AuthorizationError, ValidationError, ConflictError } from "../middleware/error-handler";

// 404 -- Employee not found
const employee = await db.query.employees.findFirst({
  where: eq(employees.id, id),
});
if (!employee) {
  throw new NotFoundError("Employee");
}

// 403 -- Insufficient role
if (req.user.role !== "ADMIN" && req.user.role !== "HR") {
  throw new AuthorizationError("Only ADMIN and HR can modify employees");
}

// 400 -- Validation failure
if (!req.body.firstName || !req.body.lastName) {
  throw new ValidationError("First name and last name are required", {
    fields: ["firstName", "lastName"],
  });
}

// 409 -- Duplicate employee number
const existing = await db.query.employees.findFirst({
  where: eq(employees.employeeNo, body.employeeNo),
});
if (existing) {
  throw new ConflictError(`Employee number ${body.employeeNo} already exists`);
}
```

---

### `asyncHandler` Wrapper

Wraps async route handlers to catch rejected promises and forward them to Express error handling without explicit try/catch in every route.

```typescript
import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

**Usage in Routes:**

```typescript
import { asyncHandler } from "../middleware/error-handler";

// Without asyncHandler -- requires manual try/catch:
router.get("/employees/:id", async (req, res, next) => {
  try {
    const employee = await db.query.employees.findFirst({ where: eq(employees.id, req.params.id) });
    if (!employee) throw new NotFoundError("Employee");
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// With asyncHandler -- errors automatically forwarded:
router.get("/employees/:id", asyncHandler(async (req, res) => {
  const employee = await db.query.employees.findFirst({ where: eq(employees.id, req.params.id) });
  if (!employee) throw new NotFoundError("Employee");
  res.json(employee);
}));
```

---

### `globalErrorHandler` -- Centralized Error Handler

The final middleware in the Express chain. Handles all errors uniformly and returns structured JSON responses.

```typescript
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isProduction = process.env.NODE_ENV === "production";

  // Handle Zod validation errors (from drizzle-zod or manual Zod parsing)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      message: "Invalid request data",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
        code: e.code,
      })),
    });
  }

  // Handle known operational errors (AppError and subclasses)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.context && { details: err.context }),
      ...(!isProduction && { stack: err.stack }),
    });
  }

  // Handle unexpected/programmer errors
  console.error("Unexpected error:", err);

  return res.status(500).json({
    error: "Internal Server Error",
    message: isProduction
      ? "An unexpected error occurred"
      : err.message,
    ...(!isProduction && { stack: err.stack }),
  });
}
```

**Error Response Formats:**

Zod validation error (400):
```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [
    { "field": "email", "message": "Invalid email", "code": "invalid_string" },
    { "field": "firstName", "message": "Required", "code": "too_small" }
  ]
}
```

AppError (e.g., 404):
```json
{
  "error": "Employee not found"
}
```

Unexpected error in development (500):
```json
{
  "error": "Internal Server Error",
  "message": "Cannot read properties of undefined (reading 'id')",
  "stack": "TypeError: Cannot read properties of undefined..."
}
```

Unexpected error in production (500):
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

### `notFoundHandler` -- Unknown API Routes

Catches requests to API routes that do not match any registered handler.

```typescript
export function notFoundHandler(req: Request, res: Response) {
  // Only catch /api/* routes -- non-API routes should fall through to Vite/SPA
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      error: "Not Found",
      message: `Route ${req.method} ${req.path} does not exist`,
    });
  }
}
```

---

## Full Middleware Registration Order

```typescript
// server/index.ts
import express from "express";
import { configureHelmet, globalLimiter, authLimiter, writeLimiter, inputSanitizer, contentTypeValidator } from "./middleware/security";
import { globalErrorHandler, notFoundHandler } from "./middleware/error-handler";

const app = express();

// 1. Security headers
configureHelmet(app);

// 2. Global rate limiter
app.use(globalLimiter);

// 3. Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 4. Input sanitization
app.use(inputSanitizer);

// 5. Content-type validation
app.use(contentTypeValidator);

// 6. Session management (connect-pg-simple)
app.use(session({ /* ... */ }));

// 7. Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// 8. Auth-specific rate limiter
app.use("/api/auth/login", authLimiter);

// 9. Write operation rate limiter
app.post("/api/*", writeLimiter);
app.put("/api/*", writeLimiter);
app.patch("/api/*", writeLimiter);
app.delete("/api/*", writeLimiter);

// 10. Application routes
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
// ... more routes

// 11. Unknown API route handler
app.use(notFoundHandler);

// 12. Global error handler (MUST be last)
app.use(globalErrorHandler);
```
