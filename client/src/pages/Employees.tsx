import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { getStatusColor, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Search,
  Loader2,
  ChevronRight,
} from "lucide-react";

interface Employee {
  id: number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  position: string;
  department?: string;
  status: string;
  role: string;
  photoUrl?: string;
  email?: string;
}

const statusOptions = ["All", "Active", "Probationary", "Terminated", "Suspended", "Resigned"];
const roleOptions = ["All", "ADMIN", "HR", "ENGINEER", "WORKER"];

export default function Employees() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const filtered = employees.filter((emp) => {
    const matchSearch =
      !search ||
      `${emp.firstName} ${emp.lastName} ${emp.employeeNo} ${emp.position}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || emp.status === statusFilter;
    const matchRole = roleFilter === "All" || emp.role === roleFilter;
    return matchSearch && matchStatus && matchRole;
  });

  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            {employees.length} total employees
          </p>
        </div>
        {canManage && (
          <Link href="/employees/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, employee no, or position..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Statuses" : s}
                </option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r === "All" ? "All Roles" : r}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No employees found</h3>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "All" || roleFilter !== "All"
                ? "Try adjusting your filters."
                : "Add your first employee to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Employee
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Employee No
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                    Position
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">
                    Department
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Status
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/employees/${emp.id}`}>
                        <div className="flex items-center gap-3 cursor-pointer">
                          {emp.photoUrl ? (
                            <img
                              src={emp.photoUrl}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {getInitials(emp.firstName, emp.lastName)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {emp.position}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {emp.employeeNo}
                    </td>
                    <td className="px-4 py-3 text-sm hidden md:table-cell">
                      {emp.position}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {emp.department || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(emp.status)}`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/employees/${emp.id}`}>
                        <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
