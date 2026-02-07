import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDate, formatTime, getStatusColor, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Clock,
  Users,
  AlertTriangle,
  Timer,
  Play,
  Search,
  CalendarDays,
} from "lucide-react";

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  timeIn?: string;
  timeOut?: string;
  totalHours?: number;
  lateMinutes?: number;
  overtimeMinutes?: number;
  verificationStatus?: string;
  shiftType?: string;
  employee?: {
    id: number;
    firstName: string;
    lastName: string;
    employeeNo: string;
    position?: string;
  };
}

interface AttendanceSummary {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  averageHours: number;
}

export default function Attendance() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [dateFilter, setDateFilter] = useState(today);
  const [search, setSearch] = useState("");

  const queryUrl = dateFilter
    ? `/api/attendance?date=${dateFilter}`
    : "/api/attendance/today";

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: [queryUrl],
  });

  const { data: summary } = useQuery<AttendanceSummary>({
    queryKey: [`/api/attendance/summary?date=${dateFilter || today}`],
  });

  const filtered = records.filter((r) => {
    if (!search) return true;
    const name = r.employee
      ? `${r.employee.firstName} ${r.employee.lastName} ${r.employee.employeeNo}`
      : "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const formatHours = (hours?: number) => {
    if (hours === undefined || hours === null) return "--";
    return `${hours.toFixed(1)}h`;
  };

  const formatMinutes = (mins?: number) => {
    if (mins === undefined || mins === null || mins === 0) return "--";
    return `${mins}m`;
  };

  // Compute statistics from records if summary API not available
  const stats = {
    totalPresent: summary?.totalPresent ?? records.length,
    totalLate: summary?.totalLate ?? records.filter((r) => (r.lateMinutes || 0) > 0).length,
    totalAbsent: summary?.totalAbsent ?? 0,
    averageHours:
      summary?.averageHours ??
      (records.length > 0
        ? records.reduce((sum, r) => sum + (r.totalHours || 0), 0) / records.length
        : 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            {dateFilter === today
              ? "Today's attendance records"
              : `Attendance for ${formatDate(dateFilter)}`}
          </p>
        </div>
        <Link href="/clock-in">
          <Button className="gap-2">
            <Play className="h-4 w-4" />
            Clock In
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold">{stats.totalPresent}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Late</p>
                <p className="text-2xl font-bold">{stats.totalLate}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold">{stats.totalAbsent}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Hours</p>
                <p className="text-2xl font-bold">{stats.averageHours.toFixed(1)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Attendance Records ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">No attendance records found</h3>
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Try adjusting your search."
                  : "No attendance records for the selected date."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Shift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {record.employee
                              ? `${record.employee.firstName} ${record.employee.lastName}`
                              : `Employee #${record.employeeId}`}
                          </p>
                          {record.employee && (
                            <p className="text-xs text-muted-foreground">
                              {record.employee.employeeNo}
                              {record.employee.position && ` - ${record.employee.position}`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {record.timeIn ? formatTime(record.timeIn) : "--"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {record.timeOut ? formatTime(record.timeOut) : "--"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatHours(record.totalHours)}
                      </TableCell>
                      <TableCell>
                        {(record.lateMinutes || 0) > 0 ? (
                          <span className="text-sm text-amber-600 font-medium">
                            {formatMinutes(record.lateMinutes)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(record.overtimeMinutes || 0) > 0 ? (
                          <span className="text-sm text-blue-600 font-medium">
                            {formatMinutes(record.overtimeMinutes)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            getStatusColor(record.verificationStatus || "Pending")
                          )}
                        >
                          {record.verificationStatus || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.shiftType || "Regular"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
