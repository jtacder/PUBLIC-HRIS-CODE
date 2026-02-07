import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
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
  Search,
  Save,
  Edit,
  X,
} from "lucide-react";

interface Employee {
  id: number;
  employeeNo: string;
  firstName: string;
  lastName: string;
  position: string;
  department?: string;
  status: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  shiftWorkDays?: string;
}

interface EditState {
  employeeId: number;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftWorkDays: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Schedules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);

  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const updateShift = useMutation({
    mutationFn: async (data: EditState) => {
      const res = await apiRequest("PATCH", `/api/employees/${data.employeeId}`, {
        shiftStartTime: data.shiftStartTime,
        shiftEndTime: data.shiftEndTime,
        shiftWorkDays: data.shiftWorkDays,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Schedule updated", variant: "success" });
      setEditing(null);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const filtered = employees.filter((emp) => {
    if (!search) return emp.status === "Active";
    return (
      `${emp.firstName} ${emp.lastName} ${emp.employeeNo} ${emp.department || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  const startEdit = (emp: Employee) => {
    setEditing({
      employeeId: emp.id,
      shiftStartTime: emp.shiftStartTime || "08:00",
      shiftEndTime: emp.shiftEndTime || "17:00",
      shiftWorkDays: emp.shiftWorkDays || "Mon,Tue,Wed,Thu,Fri",
    });
  };

  const toggleWorkDay = (day: string) => {
    if (!editing) return;
    const days = editing.shiftWorkDays ? editing.shiftWorkDays.split(",").filter(Boolean) : [];
    const idx = days.indexOf(day);
    if (idx >= 0) {
      days.splice(idx, 1);
    } else {
      days.push(day);
    }
    setEditing({ ...editing, shiftWorkDays: days.join(",") });
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedules</h1>
        <p className="text-muted-foreground">
          Manage employee shift schedules and work days
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Employee Shift Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">No employees found</h3>
              <p className="text-sm text-muted-foreground">
                {search ? "Try adjusting your search." : "No active employees to display."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Shift Start</TableHead>
                    <TableHead>Shift End</TableHead>
                    <TableHead>Work Days</TableHead>
                    {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((emp) => {
                    const isEditing = editing?.employeeId === emp.id;
                    const workDays = (isEditing ? editing.shiftWorkDays : emp.shiftWorkDays || "")
                      .split(",")
                      .filter(Boolean);

                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {emp.employeeNo} - {emp.position}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {emp.department || "--"}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="time"
                              value={editing.shiftStartTime}
                              onChange={(e) =>
                                setEditing({ ...editing, shiftStartTime: e.target.value })
                              }
                              className="w-32 h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm font-mono">
                              {emp.shiftStartTime || "--"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="time"
                              value={editing.shiftEndTime}
                              onChange={(e) =>
                                setEditing({ ...editing, shiftEndTime: e.target.value })
                              }
                              className="w-32 h-8 text-sm"
                            />
                          ) : (
                            <span className="text-sm font-mono">
                              {emp.shiftEndTime || "--"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <div className="flex flex-wrap gap-1">
                              {WEEKDAYS.map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => toggleWorkDay(day)}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-xs font-medium border transition-colors",
                                    workDays.includes(day)
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted text-muted-foreground border-input hover:bg-muted/80"
                                  )}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {WEEKDAYS.map((day) => (
                                <Badge
                                  key={day}
                                  variant={workDays.includes(day) ? "default" : "outline"}
                                  className={cn(
                                    "text-[10px] px-1.5",
                                    !workDays.includes(day) && "opacity-30"
                                  )}
                                >
                                  {day}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => updateShift.mutate(editing)}
                                  disabled={updateShift.isPending}
                                >
                                  {updateShift.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4 text-emerald-600" />
                                  )}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => setEditing(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => startEdit(emp)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
