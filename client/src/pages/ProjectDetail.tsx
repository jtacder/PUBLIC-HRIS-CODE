import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, formatCurrency, getStatusColor, getInitials } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  Users,
  Plus,
  X,
  Building,
} from "lucide-react";

interface ProjectDetail {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: string;
  address?: string;
  locationLat?: string;
  locationLng?: string;
  geoRadius?: number;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  budget?: string;
  isOffice: boolean;
  assignments?: Array<{
    id: number;
    employeeId: number;
    role?: string;
    startDate?: string;
    endDate?: string;
    isActive: boolean;
    employee?: {
      id: number;
      firstName: string;
      lastName: string;
      position: string;
      photoUrl?: string;
    };
  }>;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  position: string;
}

export default function ProjectDetail() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState("Member");

  const id = location.split("/projects/")[1]?.split("/")[0];

  const { data: project, isLoading } = useQuery<ProjectDetail>({
    queryKey: [`/api/projects/${id}`],
    enabled: !!id,
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: showAddForm,
  });

  const addAssignment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${id}/assignments`, {
        employeeId: parseInt(selectedEmployeeId),
        role: assignmentRole,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      toast({ title: "Employee assigned to project", variant: "success" });
      setShowAddForm(false);
      setSelectedEmployeeId("");
      setAssignmentRole("Member");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const removeAssignment = useMutation({
    mutationFn: async (assignmentId: number) => {
      await apiRequest("DELETE", `/api/projects/${id}/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      toast({ title: "Assignment removed", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Project not found</h2>
        <Link href="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}
            >
              {project.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.code}
            {project.clientName && ` | ${project.clientName}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{project.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-medium">{project.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{project.isOffice ? "Office" : "Project Site"}</p>
                </div>
                {project.startDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="text-sm font-medium">{formatDate(project.startDate)}</p>
                  </div>
                )}
                {project.endDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="text-sm font-medium">{formatDate(project.endDate)}</p>
                  </div>
                )}
                {project.budget && (
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-medium">{formatCurrency(project.budget)}</p>
                  </div>
                )}
                {project.geoRadius && (
                  <div>
                    <p className="text-xs text-muted-foreground">Geo-fence Radius</p>
                    <p className="text-sm font-medium">{project.geoRadius}m</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Map Placeholder */}
          {project.address && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{project.address}</span>
                </div>
                <div className="h-48 rounded-lg bg-muted flex items-center justify-center border border-dashed">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Map view</p>
                    {project.locationLat && project.locationLng && (
                      <p className="text-xs mt-1">
                        {project.locationLat}, {project.locationLng}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Assignments */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Employee Assignments</CardTitle>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowAddForm(!showAddForm)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Add Assignment Form */}
              {showAddForm && (
                <div className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Employee</Label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.position}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Role</Label>
                    <Input
                      value={assignmentRole}
                      onChange={(e) => setAssignmentRole(e.target.value)}
                      placeholder="Member"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addAssignment.mutate()}
                    disabled={!selectedEmployeeId || addAssignment.isPending}
                  >
                    {addAssignment.isPending ? "Adding..." : "Add Assignment"}
                  </Button>
                </div>
              )}

              {/* Assignments List */}
              {!project.assignments || project.assignments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No employees assigned yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {project.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                    >
                      {assignment.employee?.photoUrl ? (
                        <img
                          src={assignment.employee.photoUrl}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {assignment.employee
                            ? getInitials(assignment.employee.firstName, assignment.employee.lastName)
                            : "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {assignment.employee
                            ? `${assignment.employee.firstName} ${assignment.employee.lastName}`
                            : `Employee #${assignment.employeeId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.role || "Member"}
                        </p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => removeAssignment.mutate(assignment.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
