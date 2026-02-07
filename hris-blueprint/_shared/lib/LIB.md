# Shared Library Utilities

## Overview

The `lib/` directory contains three utility files that provide foundational services to the entire client application: the TanStack React Query client configuration, the `cn()` class name utility, and client-side authentication helpers.

---

## 1. `queryClient.ts` -- TanStack React Query Configuration

**File:** `client/src/lib/queryClient.ts`

**Purpose:** Creates and configures the singleton `QueryClient` instance used throughout the application for data fetching, caching, and mutations. Also exports the `apiRequest()` helper function for making authenticated fetch calls.

### Exports

```typescript
export const queryClient: QueryClient;
export async function apiRequest(method: string, url: string, body?: unknown): Promise<Response>;
export function getQueryFn(options?: { on401?: "returnNull" | "throw" }): QueryFunction;
```

### QueryClient Configuration

```typescript
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Default query function -- fetches from the URL used as the query key
async function defaultQueryFn({ queryKey }: { queryKey: readonly unknown[] }): Promise<unknown> {
  const url = queryKey[0] as string;
  const res = await fetch(url, { credentials: "include" });

  if (res.status === 401) {
    return null; // Return null for unauthenticated requests (handled by useAuth)
  }

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(errorBody || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 5 * 60 * 1000,       // 5 minutes -- data considered fresh
      gcTime: 10 * 60 * 1000,         // 10 minutes -- garbage collection time (formerly cacheTime)
      retry: (failureCount, error) => {
        // Do not retry on 4xx client errors
        if (error instanceof Error && error.message.includes("4")) return false;
        return failureCount < 2;       // Retry up to 2 times for server errors
      },
      refetchOnWindowFocus: false,     // Disable refetch on tab focus
    },
    mutations: {
      retry: false,                    // Never retry mutations
    },
  },
});
```

### `apiRequest()` Helper

The `apiRequest()` function is a thin wrapper around `fetch` that:
1. Sets `credentials: "include"` for session cookie transmission
2. Sets `Content-Type: application/json` for request bodies
3. Serializes the body with `JSON.stringify()`
4. Throws an error for non-OK responses with the response body as the error message

```typescript
export async function apiRequest(
  method: string,
  url: string,
  body?: unknown
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: {},
  };

  if (body !== undefined) {
    (options.headers as Record<string, string>)["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `${method} ${url} failed with status ${res.status}`);
  }

  return res;
}
```

### Usage Patterns

**Using the default query function (URL-as-key pattern):**
```tsx
// The query key IS the URL -- defaultQueryFn fetches it automatically
const { data: employees } = useQuery({
  queryKey: ["/api/employees"],
  // No queryFn needed -- the default handles it
});

// With query parameters built into the key
const { data: attendance } = useQuery({
  queryKey: ["/api/attendance?date=2026-01-15"],
});
```

**Using `apiRequest()` in mutations:**
```tsx
const createEmployee = useMutation({
  mutationFn: async (data: InsertEmployee) => {
    const res = await apiRequest("POST", "/api/employees", data);
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
  },
});
```

**Cache invalidation after mutation:**
```tsx
// Invalidate a single list
queryClient.invalidateQueries({ queryKey: ["/api/employees"] });

// Invalidate everything under a prefix
queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });

// Invalidate a specific record
queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });
```

### Query Key Convention

| Pattern | Example | Purpose |
|---------|---------|---------|
| `["/api/resource"]` | `["/api/employees"]` | List all records |
| `["/api/resource", id]` | `["/api/employees", "uuid-123"]` | Single record by ID |
| `["/api/resource?param=val"]` | `["/api/attendance?date=2026-01-15"]` | Filtered list |
| `["/api/auth/me"]` | `["/api/auth/me"]` | Current user session |
| `["/api/resource/nested"]` | `["/api/payroll/periods"]` | Nested resource |

---

## 2. `utils.ts` -- Class Name Utility and Helpers

**File:** `client/src/lib/utils.ts`

**Purpose:** Exports the `cn()` utility function that combines `clsx` (conditional class names) and `tailwind-merge` (deduplicates conflicting Tailwind classes). This is the most-imported utility in the entire codebase -- every Shadcn/UI component uses it.

### Exports

```typescript
export function cn(...inputs: ClassValue[]): string;
```

### Implementation

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### How It Works

1. **`clsx`** resolves conditional class names:
   ```ts
   clsx("px-4", isActive && "bg-primary", { "text-white": isActive })
   // => "px-4 bg-primary text-white" (when isActive is true)
   // => "px-4" (when isActive is false)
   ```

2. **`twMerge`** deduplicates conflicting Tailwind classes:
   ```ts
   twMerge("px-4 px-6")     // => "px-6" (last one wins)
   twMerge("text-sm text-lg") // => "text-lg"
   twMerge("bg-red-500 bg-blue-500") // => "bg-blue-500"
   ```

3. **`cn()`** combines both for safe, conditional Tailwind class composition:
   ```ts
   cn("px-4 py-2", isLarge && "px-8 py-4", className)
   // Correctly merges without class conflicts
   ```

### Usage Patterns

**Component variant styling:**
```tsx
<div className={cn(
  "rounded-md border p-4",              // Base styles
  variant === "destructive" && "border-red-500 bg-red-50 text-red-900",
  variant === "success" && "border-green-500 bg-green-50 text-green-900",
  className                              // Allow parent overrides
)} />
```

**Active state in navigation:**
```tsx
<Link className={cn(
  "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
  isActive
    ? "bg-primary text-primary-foreground"
    : "text-muted-foreground hover:bg-accent"
)} />
```

---

## 3. `auth.ts` -- Client-Side Auth Utilities

**File:** `client/src/lib/auth.ts`

**Purpose:** Provides client-side utility functions for making authenticated API calls. Works in conjunction with the `useAuth()` hook and `apiRequest()` helper.

### Exports

```typescript
export async function fetchWithAuth(url: string, options?: RequestInit): Promise<Response>;
export function getAuthHeaders(): HeadersInit;
```

### Implementation

```typescript
/**
 * Fetch wrapper that ensures credentials are included for session-based auth.
 * Redirects to login page on 401 responses.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Session expired -- redirect to login
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  return res;
}

/**
 * Returns standard headers for authenticated JSON API requests.
 */
export function getAuthHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    // Session cookie is sent automatically via credentials: "include"
  };
}
```

### Usage Notes

- The primary authentication mechanism is **session cookies**, not JWT tokens
- `credentials: "include"` on every fetch call ensures the `connect.sid` cookie is sent
- No Authorization header is needed -- the session cookie handles it
- The server uses `connect-pg-simple` to store sessions in PostgreSQL
- Sessions have a 7-day TTL configured in Express session options

---

## Library Dependency Map

```
queryClient.ts
├── @tanstack/react-query (QueryClient, QueryFunction)
├── fetch (browser API)
└── Used by: every component that fetches or mutates data

utils.ts
├── clsx (conditional class names)
├── tailwind-merge (Tailwind class deduplication)
└── Used by: every Shadcn/UI component and custom component

auth.ts
├── fetch (browser API)
└── Used by: useAuth hook, protected route components
```
