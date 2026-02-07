import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Clock,
  FolderKanban,
  ListTodo,
  CalendarDays,
  DollarSign,
  AlertTriangle,
  UserPlus,
  Play,
  Banknote,
  Loader2,
} from "lucide-react";

interface DashboardStats {
  totalEmployees: number;
  todayAttendance: number;
  activeProjects: number;
  pendingTasks: number;
  pendingLeave: number;
  pendingExpenses: number;
  activeNTEs: number;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/statistics"],
  });

  const statCards = [
    {
      label: "Total Employees",
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/employees",
    },
    {
      label: "Today's Attendance",
      value: stats?.todayAttendance ?? 0,
      icon: Clock,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/attendance",
    },
    {
      label: "Active Projects",
      value: stats?.activeProjects ?? 0,
      icon: FolderKanban,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/projects",
    },
    {
      label: "Pending Tasks",
      value: stats?.pendingTasks ?? 0,
      icon: ListTodo,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/tasks",
    },
    {
      label: "Pending Leave",
      value: stats?.pendingLeave ?? 0,
      icon: CalendarDays,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/leave-requests",
    },
    {
      label: "Pending Expenses",
      value: stats?.pendingExpenses ?? 0,
      icon: DollarSign,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/cash-advances",
    },
    {
      label: "Active NTEs",
      value: stats?.activeNTEs ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/disciplinary",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{user?.email ? `, ${user.email}` : ""}. Here is your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/clock-in">
              <Button variant="outline" className="gap-2">
                <Play className="h-4 w-4" />
                Clock In
              </Button>
            </Link>
            {(user?.role === "ADMIN" || user?.role === "HR") && (
              <>
                <Link href="/employees/new">
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    New Employee
                  </Button>
                </Link>
                <Link href="/payroll">
                  <Button variant="outline" className="gap-2">
                    <Banknote className="h-4 w-4" />
                    Run Payroll
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
