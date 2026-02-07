# State Management

## Overview

The HRIS system uses **TanStack React Query v5** as its sole state management solution. There is no Zustand, Redux, Jotai, or any other client-side global state store. All server data flows through React Query's cache, and there is no client-only global state that needs a separate store.

This deliberate architectural choice simplifies the codebase significantly: every piece of data visible in the UI either comes from React Query's cache (server state) or from local component state managed by `useState` / React Hook Form (UI state).

---

## Why TanStack React Query Instead of Redux/Zustand

| Concern | TanStack Query Approach |
|---------|------------------------|
| Data fetching | Built-in with `useQuery` |
| Caching | Automatic with configurable stale/gc times |
| Cache invalidation | `queryClient.invalidateQueries()` |
| Optimistic updates | `onMutate` callback with rollback |
| Loading states | `isLoading`, `isFetching`, `isPending` |
| Error states | `isError`, `error` object |
| Background refetching | Automatic on window focus (disabled), mount, interval |
| Pagination | Built-in `keepPreviousData` |
| Deduplication | Automatic -- same query key shares one network request |

---

## Query Key Patterns

Query keys follow a URL-as-key convention. The first element of the key array is always the API URL string, which doubles as the fetch URL via the default query function.

```typescript
// List queries -- fetch all records
["/api/employees"]                        // All employees
["/api/attendance"]                       // All attendance logs
["/api/payroll"]                          // All payroll records
["/api/leave-requests"]                   // All leave requests
["/api/projects"]                         // All projects
["/api/tasks"]                            // All tasks
["/api/cash-advances"]                    // All cash advances
["/api/disciplinary"]                     // All disciplinary records
["/api/expenses"]                         // All expenses
["/api/devotionals"]                      // All devotionals
["/api/audit-logs"]                       // All audit logs
["/api/notifications"]                    // All notifications

// Detail queries -- fetch a single record by ID
["/api/employees", employeeId]            // Single employee
["/api/tasks", taskId]                    // Single task
["/api/projects", projectId]              // Single project

// Filtered queries -- URL with query parameters
["/api/attendance?date=2026-01-15"]       // Attendance for a specific date
["/api/payroll?periodId=uuid-123"]        // Payroll for a specific period
["/api/tasks?projectId=uuid-456"]         // Tasks for a specific project

// Auth query
["/api/auth/me"]                          // Current authenticated user

// Nested resource queries
["/api/payroll/periods"]                  // All payroll periods
["/api/employees/uuid-123/documents"]     // Documents for an employee
["/api/employees/uuid-123/complete-file"] // Full 201 file for an employee
```

---

## Data Fetching Patterns

### Basic List Query

```tsx
import { useQuery } from "@tanstack/react-query";

function EmployeeList() {
  const { data: employees, isLoading, error } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    // No queryFn needed -- uses the default from queryClient.ts
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error) return <Alert variant="destructive">{error.message}</Alert>;

  return (
    <Table>
      {employees?.map((emp) => (
        <TableRow key={emp.id}>
          <TableCell>{emp.firstName} {emp.lastName}</TableCell>
          <TableCell>{emp.position}</TableCell>
          <TableCell><Badge>{emp.status}</Badge></TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
```

### Detail Query with ID Parameter

```tsx
function EmployeeDetail({ id }: { id: string }) {
  const { data: employee, isLoading } = useQuery<Employee>({
    queryKey: ["/api/employees", id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Employee not found");
      return res.json();
    },
    enabled: !!id, // Only fetch when ID is available
  });

  if (isLoading) return <Skeleton />;
  return <EmployeeCard employee={employee!} />;
}
```

---

## Mutation Patterns

### Basic Mutation with Cache Invalidation

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

function CreateEmployeeForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmployee) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate the employee list so it refetches with the new record
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
      {/* form fields */}
      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
```

### Mutation with Optimistic Update

Used when the UI should immediately reflect the change before the server confirms it.

```tsx
const updateStatusMutation = useMutation({
  mutationFn: async ({ id, status }: { id: string; status: string }) => {
    const res = await apiRequest("PATCH", `/api/leave-requests/${id}`, { status });
    return res.json();
  },
  onMutate: async ({ id, status }) => {
    // Cancel any outgoing refetches to avoid overwriting optimistic update
    await queryClient.cancelQueries({ queryKey: ["/api/leave-requests"] });

    // Snapshot previous value for rollback
    const previousRequests = queryClient.getQueryData<LeaveRequest[]>(["/api/leave-requests"]);

    // Optimistically update the cache
    queryClient.setQueryData<LeaveRequest[]>(["/api/leave-requests"], (old) =>
      old?.map((req) => (req.id === id ? { ...req, status } : req))
    );

    return { previousRequests };
  },
  onError: (_err, _variables, context) => {
    // Rollback to previous value on error
    if (context?.previousRequests) {
      queryClient.setQueryData(["/api/leave-requests"], context.previousRequests);
    }
    toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
  },
  onSettled: () => {
    // Always refetch after error or success to ensure cache is in sync
    queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
  },
});
```

---

## Cache Invalidation Strategies

### After Create/Update/Delete

```typescript
// Invalidate a specific list (most common)
queryClient.invalidateQueries({ queryKey: ["/api/employees"] });

// Invalidate a specific record
queryClient.invalidateQueries({ queryKey: ["/api/employees", employeeId] });

// Invalidate multiple related caches after a payroll approval
queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
queryClient.invalidateQueries({ queryKey: ["/api/payslips"] });

// Invalidate everything under a prefix (useful for deeply nested resources)
queryClient.invalidateQueries({
  predicate: (query) =>
    (query.queryKey[0] as string).startsWith("/api/attendance"),
});
```

### On Logout -- Clear Everything

```typescript
const logoutMutation = useMutation({
  mutationFn: () => apiRequest("POST", "/api/auth/logout"),
  onSuccess: () => {
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.clear(); // Remove ALL cached data
  },
});
```

---

## Local UI State (Not in React Query)

Some transient UI state is managed locally because it does not represent server data:

| State | Managed By | Example |
|-------|-----------|---------|
| Form field values | React Hook Form `useForm()` | Employee create/edit form |
| Modal open/closed | `useState(false)` | Dialog visibility |
| Search query text | `useState("")` | Employee search input |
| Active tab | `useState("personal")` | Employee detail tab |
| Sort column/direction | `useState({ column: "name", desc: false })` | Table sorting |
| Selected rows | `useState<Set<string>>(new Set())` | Bulk selection |
| Filter selections | `useState({ status: "Active", role: "" })` | Dropdown filters |
| Date range picker | `useState<DateRange>()` | Attendance date filter |

**Key Rule:** If the data comes from the server, it goes through React Query. If it is purely UI state that does not persist, it stays in local `useState`.

---

## Query Configuration Defaults

Configured in `client/src/lib/queryClient.ts`:

```typescript
{
  queries: {
    staleTime: 5 * 60 * 1000,        // 5 minutes -- data considered fresh
    gcTime: 10 * 60 * 1000,          // 10 minutes -- garbage collection time
    retry: (failureCount, error) => {
      if (error.message.includes("4")) return false;  // No retry on 4xx
      return failureCount < 2;                         // Retry up to 2x for 5xx
    },
    refetchOnWindowFocus: false,      // Disabled -- manual refetch preferred
  },
  mutations: {
    retry: false,                     // Never retry mutations
  },
}
```

---

## Module-Specific Query Key Reference

| Module | Query Keys |
|--------|------------|
| Dashboard | `["/api/dashboard/stats"]`, `["/api/attendance/today"]`, `["/api/notifications"]` |
| Employees | `["/api/employees"]`, `["/api/employees", id]`, `["/api/employees/{id}/complete-file"]` |
| Schedules | `["/api/schedules"]`, `["/api/schedule-templates"]` |
| Attendance | `["/api/attendance"]`, `["/api/attendance?date=..."]`, `["/api/attendance/today"]` |
| 201 Files | `["/api/employees/{id}/documents"]` |
| Leave | `["/api/leave-requests"]`, `["/api/leave-types"]`, `["/api/leave-allocations"]` |
| Loans | `["/api/cash-advances"]`, `["/api/cash-advances/{id}/deductions"]` |
| Payroll | `["/api/payroll"]`, `["/api/payroll/periods"]`, `["/api/payslips"]` |
| Disciplinary | `["/api/disciplinary"]`, `["/api/disciplinary/{id}"]` |
| HR Settings | `["/api/company-settings"]`, `["/api/holidays"]` |
| Devotional | `["/api/devotionals"]`, `["/api/devotionals/{id}"]` |
| Audit Trail | `["/api/audit-logs"]` |
| Permissions | `["/api/roles"]`, `["/api/permissions"]`, `["/api/users"]` |
| Notifications | `["/api/notifications"]`, `["/api/notifications/unread-count"]` |
| Projects | `["/api/projects"]`, `["/api/projects/{id}"]`, `["/api/projects/{id}/assignments"]` |
| Tasks | `["/api/tasks"]`, `["/api/tasks?projectId=..."]`, `["/api/tasks/{id}/comments"]` |
| Expenses | `["/api/expenses"]`, `["/api/expenses/{id}"]` |
