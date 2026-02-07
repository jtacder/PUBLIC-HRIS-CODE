import { useLocation, Link } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { cn } from "../lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListTodo,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  AlertTriangle,
  CalendarDays,
  Banknote,
  Settings,
  BookOpen,
  ScrollText,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", href: "/employees", icon: Users, roles: ["ADMIN", "HR"] },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Schedules", href: "/schedules", icon: Calendar },
  { label: "Attendance", href: "/attendance", icon: Clock },
  { label: "Payroll", href: "/payroll", icon: DollarSign, roles: ["ADMIN", "HR"] },
  { label: "201 Files", href: "/201-files", icon: FileText, roles: ["ADMIN", "HR"] },
  { label: "Disciplinary", href: "/disciplinary", icon: AlertTriangle, roles: ["ADMIN", "HR"] },
  { label: "Leave Requests", href: "/leave-requests", icon: CalendarDays },
  { label: "Cash Advances", href: "/cash-advances", icon: Banknote },
  { label: "Devotionals", href: "/devotionals", icon: BookOpen },
  { label: "Audit Trail", href: "/audit-trail", icon: ScrollText, roles: ["ADMIN"] },
  { label: "HR Settings", href: "/hr-settings", icon: Settings, roles: ["ADMIN", "HR"] },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (user?.isSuperadmin) return true;
    return item.roles.includes(user?.role || "");
  });

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div>
            <h1 className="font-serif text-xl text-white tracking-tight">
              <span className="text-[hsl(var(--sidebar-primary))]">HRIS</span>
            </h1>
            <p className="text-xs text-sidebar-foreground/60">
              Human Resource System
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground hidden lg:block"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-[hsl(var(--sidebar-primary))]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-2 px-3">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user.email}
            </p>
            <p className="text-xs text-sidebar-foreground/50">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 p-2 rounded-md bg-sidebar text-sidebar-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar z-40 transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[272px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
