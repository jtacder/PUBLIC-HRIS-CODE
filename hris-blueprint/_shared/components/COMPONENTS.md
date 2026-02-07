# Shared Components

## Overview

The HRIS UI is built on **Shadcn/UI** (New York style) with Radix UI primitives underneath, plus three custom components. All components live in `client/src/components/` and use Tailwind CSS with HSL CSS variables for theming. The system supports dark mode via class-based toggling.

## Shadcn/UI Component Library (40+ Components)

All Shadcn/UI components are configured through the root `components.json` file:

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/index.css",
    "baseColor": "neutral"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Form Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Button** | `ui/button.tsx` | N/A | Primary action trigger. Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`. Sizes: `default`, `sm`, `lg`, `icon`. |
| **Input** | `ui/input.tsx` | N/A | Standard text input. Styled with `flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1`. |
| **Textarea** | `ui/textarea.tsx` | N/A | Multi-line text input with auto-resize support. |
| **Select** | `ui/select.tsx` | `@radix-ui/react-select` | Dropdown select with search, scroll, and grouped options. Sub-components: `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `SelectGroup`, `SelectLabel`. |
| **Checkbox** | `ui/checkbox.tsx` | `@radix-ui/react-checkbox` | Boolean toggle with check/indeterminate states. Used in bulk selection tables. |
| **Radio Group** | `ui/radio-group.tsx` | `@radix-ui/react-radio-group` | Single-select option group. Sub-components: `RadioGroup`, `RadioGroupItem`. |
| **Switch** | `ui/switch.tsx` | `@radix-ui/react-switch` | Boolean toggle styled as a sliding switch. Used for settings toggles. |
| **Slider** | `ui/slider.tsx` | `@radix-ui/react-slider` | Range input slider. Used in geofence radius configuration. |
| **Label** | `ui/label.tsx` | `@radix-ui/react-label` | Accessible form label with `htmlFor` binding. |
| **Form** | `ui/form.tsx` | N/A | React Hook Form integration wrapper. Provides `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` for structured form layouts with validation display. |

#### Form Component Usage Pattern

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
});

function EmployeeForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
```

### Display Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Badge** | `ui/badge.tsx` | N/A | Status indicator pill. Variants: `default`, `secondary`, `destructive`, `outline`. Used for employee status, task priority, payroll status. |
| **Avatar** | `ui/avatar.tsx` | `@radix-ui/react-avatar` | Profile image with fallback initials. Sub-components: `Avatar`, `AvatarImage`, `AvatarFallback`. |
| **Alert** | `ui/alert.tsx` | N/A | Contextual message box. Variants: `default`, `destructive`. Sub-components: `Alert`, `AlertTitle`, `AlertDescription`. |
| **Card** | `ui/card.tsx` | N/A | Container with header/content/footer. Sub-components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. Primary layout component for dashboard widgets and detail views. |
| **Table** | `ui/table.tsx` | N/A | HTML table with styled rows and cells. Sub-components: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`, `TableFooter`. |
| **Separator** | `ui/separator.tsx` | `@radix-ui/react-separator` | Horizontal or vertical divider line. |
| **Progress** | `ui/progress.tsx` | `@radix-ui/react-progress` | Linear progress bar with animated fill. Used in payroll processing status and task completion tracking. |
| **Aspect Ratio** | `ui/aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` | Maintains width-to-height ratio. Used for photo snapshots in attendance verification. |

#### Badge Variants in the HRIS

```tsx
// Employee status badges
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Probationary</Badge>
<Badge variant="destructive">Terminated</Badge>
<Badge variant="outline">Suspended</Badge>

// Task priority badges (custom className colors)
<Badge className="bg-green-500">Low</Badge>
<Badge className="bg-yellow-500">Medium</Badge>
<Badge className="bg-orange-500">High</Badge>
<Badge className="bg-red-600">Critical</Badge>

// Payroll status badges
<Badge variant="outline">DRAFT</Badge>
<Badge variant="default">APPROVED</Badge>
<Badge className="bg-green-600">RELEASED</Badge>
```

### Navigation Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Tabs** | `ui/tabs.tsx` | `@radix-ui/react-tabs` | Tabbed content switcher. Sub-components: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Used for employee detail tabs (Personal, Employment, Payroll, Documents). |
| **Accordion** | `ui/accordion.tsx` | `@radix-ui/react-accordion` | Collapsible content sections. Used in FAQ and settings pages. |
| **Breadcrumb** | `ui/breadcrumb.tsx` | N/A | Hierarchical page navigation trail. Sub-components: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`, `BreadcrumbPage`. |
| **Navigation Menu** | `ui/navigation-menu.tsx` | `@radix-ui/react-navigation-menu` | Top-level navigation with dropdown menus. |
| **Menubar** | `ui/menubar.tsx` | `@radix-ui/react-menubar` | Horizontal menu bar with dropdown submenus. |

### Overlay Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Dialog** | `ui/dialog.tsx` | `@radix-ui/react-dialog` | Modal dialog with overlay backdrop. Sub-components: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`. Primary modal for create/edit forms. |
| **Popover** | `ui/popover.tsx` | `@radix-ui/react-popover` | Positioned floating content panel. Used for date pickers and filter popovers. |
| **Tooltip** | `ui/tooltip.tsx` | `@radix-ui/react-tooltip` | Hover-triggered informational popup. Sub-components: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`. |
| **Hover Card** | `ui/hover-card.tsx` | `@radix-ui/react-hover-card` | Rich preview card on hover. Used for employee name hover previews. |
| **Dropdown Menu** | `ui/dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | Context-aware action menu. Sub-components: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`, `DropdownMenuGroup`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`. |
| **Context Menu** | `ui/context-menu.tsx` | `@radix-ui/react-context-menu` | Right-click context menu with nested submenus. |
| **Alert Dialog** | `ui/alert-dialog.tsx` | `@radix-ui/react-alert-dialog` | Confirmation dialog that requires user action. Used for delete confirmations and irreversible actions (payroll release, employee termination). Sub-components: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`. |
| **Sheet** | `ui/sheet.tsx` | `@radix-ui/react-dialog` | Slide-in panel from screen edge. Used for mobile navigation and filter panels. Sub-components: `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`. |

### Feedback Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Toast** | `ui/toast.tsx` | `@radix-ui/react-toast` | Temporary notification popup. Variants: `default`, `destructive`. Sub-components: `Toast`, `ToastAction`, `ToastClose`, `ToastTitle`, `ToastDescription`, `ToastProvider`, `ToastViewport`. |
| **Toaster** | `ui/toaster.tsx` | N/A | Toast container that renders all active toasts. Placed once in the root layout. |
| **Sonner** | `ui/sonner.tsx` | `sonner` | Alternative toast library with richer animations. Provides `toast.success()`, `toast.error()`, `toast.loading()` methods. |

#### Toast Usage Pattern

```tsx
import { useToast } from "@/hooks/use-toast";

function EmployeeActions() {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteEmployee(id);
      toast({
        title: "Employee deleted",
        description: "The employee record has been soft-deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete employee.",
        variant: "destructive",
      });
    }
  };
}
```

### Data Entry Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Calendar** | `ui/calendar.tsx` | `react-day-picker` | Date selection calendar grid. Used inside Popover for date pickers. |
| **Date Picker** | `ui/date-picker.tsx` | Calendar + Popover | Composite date picker component. Combines Popover trigger (formatted date button) with Calendar content. |
| **Input OTP** | `ui/input-otp.tsx` | `input-otp` | One-time password input with separated digit slots. Used in two-factor authentication flows. |
| **Command** | `ui/command.tsx` | `cmdk` | Command palette / searchable list. Sub-components: `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut`, `CommandDialog`. Foundation for the searchable employee select. |

### Layout Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Scroll Area** | `ui/scroll-area.tsx` | `@radix-ui/react-scroll-area` | Custom-styled scrollable container with visible scrollbars. Used for long lists and table containers. |
| **Resizable** | `ui/resizable.tsx` | `react-resizable-panels` | Draggable panel splitter. Sub-components: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`. Used for side-by-side layouts. |
| **Collapsible** | `ui/collapsible.tsx` | `@radix-ui/react-collapsible` | Expandable/collapsible content section. Used in sidebar navigation groups. |
| **Carousel** | `ui/carousel.tsx` | `embla-carousel-react` | Horizontal content slider. Sub-components: `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`. |

### Toggle Components

| Component | File | Radix Primitive | Description |
|-----------|------|-----------------|-------------|
| **Toggle** | `ui/toggle.tsx` | `@radix-ui/react-toggle` | Pressable toggle button. Variants: `default`, `outline`. Sizes: `default`, `sm`, `lg`. |
| **Toggle Group** | `ui/toggle-group.tsx` | `@radix-ui/react-toggle-group` | Group of mutually exclusive or multi-select toggles. Used for view mode switching (table/grid/kanban). |

---

## Custom Components (3)

### 1. Sidebar (`sidebar.tsx`)

**Purpose:** Role-based navigation sidebar that renders different menu items depending on the authenticated user's role.

**Location:** `client/src/components/sidebar.tsx`

**Role-Based Menu Visibility:**

| Menu Item | ADMIN | HR | ENGINEER | WORKER |
|-----------|:-----:|:--:|:--------:|:------:|
| Dashboard | Yes | Yes | Yes | Yes |
| Employees | Yes | Yes | No | No |
| Schedules | Yes | Yes | No | No |
| Attendance | Yes | Yes | Yes | Yes |
| 201 Files | Yes | Yes | No | No |
| Leave Management | Yes | Yes | Yes | Yes |
| Loans | Yes | Yes | No | No |
| Payroll | Yes | Yes | No | No |
| Disciplinary | Yes | Yes | No | No |
| HR Settings | Yes | Yes | No | No |
| Devotional | Yes | Yes | Yes | Yes |
| Audit Trail | Yes | No | No | No |
| Permissions | Yes | No | No | No |
| Projects | Yes | Yes | Yes | No |
| Tasks | Yes | Yes | Yes | Yes |
| Expenses | Yes | Yes | Yes | Yes |

**Key Implementation Details:**

```tsx
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: string[]; // Which roles can see this item
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "HR", "ENGINEER", "WORKER"] },
  { label: "Employees", href: "/employees", icon: Users, roles: ["ADMIN", "HR"] },
  { label: "Attendance", href: "/attendance", icon: Clock, roles: ["ADMIN", "HR", "ENGINEER", "WORKER"] },
  // ... more items
];

export function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 border-r bg-card">
      <nav className="space-y-1 p-4">
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              location === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

**Dependencies:** `useAuth` hook, `wouter` for routing, `lucide-react` for icons, `cn()` utility.

---

### 2. Searchable Employee Select (`searchable-employee-select.tsx`)

**Purpose:** Accessible searchable dropdown for selecting employees. Built on the cmdk `Command` component with keyboard navigation and full ARIA combobox pattern support.

**Location:** `client/src/components/searchable-employee-select.tsx`

**Used By:** Attendance (manual time-in for employee), Disciplinary (select employee for NTE), Tasks (assign task to employee), Payroll (lookup specific employee record), Projects (assign employee to project), Expenses (select requester).

**Key Implementation Details:**

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableEmployeeSelectProps {
  value?: string;
  onChange: (employeeId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableEmployeeSelect({
  value,
  onChange,
  placeholder = "Select employee...",
  disabled = false,
}: SearchableEmployeeSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  const selectedEmployee = employees.find((e: any) => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select employee"
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedEmployee
            ? `${selectedEmployee.lastName}, ${selectedEmployee.firstName}`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {employees.map((employee: any) => (
                <CommandItem
                  key={employee.id}
                  value={`${employee.lastName} ${employee.firstName} ${employee.employeeNo}`}
                  onSelect={() => {
                    onChange(employee.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === employee.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{employee.lastName}, {employee.firstName}</span>
                    <span className="text-xs text-muted-foreground">
                      {employee.employeeNo} - {employee.position}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

**Accessibility Features:**
- `role="combobox"` on trigger button
- `aria-expanded` state tracks open/closed
- `aria-label="Select employee"` for screen readers
- Keyboard navigation: Arrow keys to browse, Enter to select, Escape to close
- Type-ahead search filters results as you type
- Screen reader announces selected employee name

---

### 3. Theme Toggle (`theme-toggle.tsx`)

**Purpose:** Dark/light mode toggle button with dynamic aria-label that announces the current mode.

**Location:** `client/src/components/theme-toggle.tsx`

**Key Implementation Details:**

```tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

**How Dark Mode Works:**
1. `next-themes` manages the `dark` class on the `<html>` element
2. Tailwind CSS `darkMode: "class"` activates `dark:` variants
3. HSL CSS variables in `index.css` define both light and dark color palettes
4. All Shadcn/UI components automatically adapt via CSS variable references

**CSS Variable Theme System (excerpt from `client/src/index.css`):**

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --border: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --border: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}
```

---

## Component Dependency Map

```
Shadcn/UI Primitives (40+)
├── Radix UI (accessibility + behavior)
├── Tailwind CSS (styling)
├── class-variance-authority (variant management)
├── clsx + tailwind-merge via cn() (class composition)
└── lucide-react (icons)

Custom Components
├── sidebar.tsx
│   ├── useAuth() hook
│   ├── wouter (routing)
│   ├── lucide-react (icons)
│   └── cn() utility
├── searchable-employee-select.tsx
│   ├── Command (cmdk)
│   ├── Popover
│   ├── Button
│   ├── TanStack Query (employee data)
│   └── cn() utility
└── theme-toggle.tsx
    ├── Button
    ├── next-themes
    └── lucide-react (Sun, Moon icons)
```

## Adding New Shadcn/UI Components

To add a new Shadcn/UI component to the project:

```bash
npx shadcn@latest add [component-name]
```

This will:
1. Create the component file in `client/src/components/ui/`
2. Install any required Radix UI dependencies
3. Apply the New York style variant automatically

Components are designed to be copied and modified. They are not installed as a package dependency -- the source code lives directly in the project.
