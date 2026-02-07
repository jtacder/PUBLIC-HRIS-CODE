# Shared Hooks

## Overview

The HRIS uses three shared React hooks that provide cross-cutting functionality to every module. These hooks encapsulate authentication state, toast notifications, and responsive viewport detection. All hooks follow React conventions and are used throughout the client application.

---

## 1. `useAuth()` -- Authentication State Hook

**File:** `client/src/hooks/use-auth.ts`

**Purpose:** Provides the current authenticated user, role detection flags, loading state, and login/logout functions. This is the single source of truth for authentication state across the entire client application.

### Return Type

```typescript
interface AuthContext {
  user: User | null;           // Current authenticated user object or null
  isAdmin: boolean;            // true if user.role === 'ADMIN'
  isHR: boolean;               // true if user.role === 'HR'
  isAuthenticated: boolean;    // true if user is not null
  isLoading: boolean;          // true while initial auth check is in progress
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

interface User {
  id: string;                  // UUID
  email: string;
  role: "ADMIN" | "HR" | "ENGINEER" | "WORKER";
  isSuperadmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;  // ISO timestamp
}

interface LoginCredentials {
  email: string;
  password: string;
}
```

### Implementation Details

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();

  // Fetch current session on mount and cache it
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Auth check failed");
      return res.json();
    },
    retry: false,              // Do not retry on 401
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear(); // Clear all cached data on logout
    },
  });

  return {
    user: user ?? null,
    isAdmin: user?.role === "ADMIN",
    isHR: user?.role === "HR",
    isAuthenticated: !!user,
    isLoading,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
}
```

### Usage Patterns

**Protecting UI elements by role:**
```tsx
function EmployeeActions({ employeeId }: { employeeId: string }) {
  const { isAdmin, isHR } = useAuth();

  return (
    <div>
      {/* All authenticated users can view */}
      <Button onClick={() => navigate(`/employees/${employeeId}`)}>View</Button>

      {/* Only ADMIN and HR can edit */}
      {(isAdmin || isHR) && (
        <Button onClick={() => navigate(`/employees/${employeeId}/edit`)}>Edit</Button>
      )}

      {/* Only ADMIN can delete */}
      {isAdmin && (
        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
      )}
    </div>
  );
}
```

**Redirecting unauthenticated users:**
```tsx
function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <DashboardContent />;
}
```

**Checking role for page-level access:**
```tsx
function PayrollPage() {
  const { user, isAdmin, isHR, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAdmin && !isHR) return <UnauthorizedPage />;

  return <PayrollDashboard />;
}
```

### How Authentication Works End-to-End

1. User submits login form with email + password
2. `POST /api/auth/login` validates credentials with bcrypt (12 rounds)
3. Passport.js creates a server-side session stored in PostgreSQL (`connect-pg-simple`)
4. Session cookie (`connect.sid`) is set with `httpOnly`, `secure` (prod), `sameSite: lax`
5. `useAuth()` calls `GET /api/auth/me` which reads the session and returns the user object
6. TanStack Query caches the user object with 5-minute stale time
7. On logout, server destroys the session and client clears all query caches

---

## 2. `useToast()` -- Toast Notification Hook

**File:** `client/src/hooks/use-toast.ts`

**Purpose:** Wraps the Radix UI toast system to provide a simple imperative API for showing temporary notifications. Used for success confirmations, error messages, and informational alerts.

### Return Type

```typescript
interface UseToastReturn {
  toast: (props: ToastProps) => { id: string; dismiss: () => void; update: (props: ToastProps) => void };
  dismiss: (toastId?: string) => void;
  toasts: ToastProps[];
}

interface ToastProps {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: React.ReactNode;     // Optional action button
  duration?: number;             // Auto-dismiss in milliseconds (default: 5000)
}
```

### Implementation Details

The hook uses a reducer pattern to manage a queue of toast notifications. Toasts auto-dismiss after their duration and can be manually dismissed.

```typescript
import { useState, useCallback } from "react";

const TOAST_LIMIT = 3;           // Maximum simultaneous toasts
const TOAST_REMOVE_DELAY = 5000; // Default auto-dismiss duration

type ToastActionType = "ADD_TOAST" | "UPDATE_TOAST" | "DISMISS_TOAST" | "REMOVE_TOAST";

// Internal state managed via useReducer
let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

// Simplified public API
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = useCallback((props: ToastProps) => {
    const id = genId();
    setToasts((prev) => [...prev, { ...props, id }].slice(-TOAST_LIMIT));

    // Auto-dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, props.duration ?? TOAST_REMOVE_DELAY);

    return {
      id,
      dismiss: () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      update: (newProps: ToastProps) =>
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...newProps } : t))),
    };
  }, []);

  const dismiss = useCallback((id?: string) => {
    if (id) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    } else {
      setToasts([]);
    }
  }, []);

  return { toast, dismiss, toasts };
}
```

### Usage Patterns

**Success notification after mutation:**
```tsx
const { toast } = useToast();

const mutation = useMutation({
  mutationFn: (data) => apiRequest("POST", "/api/employees", data),
  onSuccess: () => {
    toast({
      title: "Employee created",
      description: "The new employee record has been saved successfully.",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
  },
  onError: (error) => {
    toast({
      title: "Error",
      description: error.message || "Failed to create employee.",
      variant: "destructive",
    });
  },
});
```

**Toast with action button:**
```tsx
toast({
  title: "Leave request submitted",
  description: "Your leave request is pending approval.",
  action: (
    <ToastAction altText="View request" onClick={() => navigate("/leave")}>
      View
    </ToastAction>
  ),
});
```

**Destructive error toast:**
```tsx
toast({
  title: "Session expired",
  description: "Please log in again to continue.",
  variant: "destructive",
  duration: 10000, // Stay visible for 10 seconds
});
```

---

## 3. `useMobile()` -- Viewport Detection Hook

**File:** `client/src/hooks/use-mobile.tsx`

**Purpose:** Returns a boolean indicating whether the current viewport width is below the mobile breakpoint. Used for responsive layout decisions such as showing the Sheet sidebar on mobile vs. the fixed sidebar on desktop.

### Return Type

```typescript
interface UseMobileReturn {
  isMobile: boolean; // true when viewport width < 768px
}
```

### Implementation Details

```tsx
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // Matches Tailwind's `md` breakpoint

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Use matchMedia for efficient viewport tracking
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Set initial value
    setIsMobile(mql.matches);

    // Listen for viewport changes
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
```

### Usage Patterns

**Responsive sidebar rendering:**
```tsx
function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();

  return (
    <div className="flex min-h-screen">
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar />
      )}
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**Conditional table column visibility:**
```tsx
function EmployeeTable() {
  const isMobile = useMobile();

  const columns = [
    { header: "Name", accessor: "fullName" },
    { header: "Employee No.", accessor: "employeeNo" },
    // Hide these columns on mobile
    ...(!isMobile
      ? [
          { header: "Department", accessor: "department" },
          { header: "Position", accessor: "position" },
          { header: "Status", accessor: "status" },
        ]
      : []),
  ];

  return <DataTable columns={columns} data={employees} />;
}
```

---

## Hook Dependency Map

```
use-auth.ts
├── @tanstack/react-query (useQuery, useMutation, useQueryClient)
├── @/lib/queryClient (apiRequest helper)
└── Server: GET /api/auth/me, POST /api/auth/login, POST /api/auth/logout

use-toast.ts
├── react (useState, useCallback)
└── @radix-ui/react-toast (Toast component primitives)

use-mobile.tsx
├── react (useState, useEffect)
└── window.matchMedia (browser API)
```

## Which Modules Use Which Hooks

| Hook | Used By |
|------|---------|
| `useAuth()` | Every module -- authentication is required for all pages |
| `useToast()` | Every module that performs mutations (create, update, delete, approve) |
| `useMobile()` | Root layout (sidebar), Dashboard (widget layout), Attendance (scanner view), Employee list (column visibility) |
