import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, getStatusColor } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  AlertTriangle,
  Search,
  ChevronRight,
} from "lucide-react";

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  employeeNo: string;
}

interface DisciplinaryRecord {
  id: number;
  employeeId: number;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
  violation: string;
  description?: string;
  severity: string;
  dateIssued: string;
  deadline?: string;
  status: string;
  createdAt: string;
}

const severityOptions = ["Minor", "Major", "Grave"];
const statusOptions = ["All", "Issued", "Explanation_Received", "Resolved"];

export default function Disciplinary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [nteForm, setNteForm] = useState({
    employeeId: "",
    violation: "",
    description: "",
    severity: "Minor",
  });

  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  const { data: records = [], isLoading } = useQuery<DisciplinaryRecord[]>({
    queryKey: ["/api/disciplinary"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: showIssueDialog,
  });

  const issueMutation = useMutation({
    mutationFn: async (data: typeof nteForm) => {
      const res = await apiRequest("POST", "/api/disciplinary", {
        ...data,
        employeeId: Number(data.employeeId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary"] });
      toast({ title: "NTE issued successfully", variant: "success" });
      setShowIssueDialog(false);
      setNteForm({ employeeId: "", violation: "", description: "", severity: "Minor" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleIssueNTE = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nteForm.employeeId || !nteForm.violation || !nteForm.severity) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    issueMutation.mutate(nteForm);
  };

  const filtered = records.filter((rec) => {
    const empName = rec.employeeName || `${rec.firstName || ""} ${rec.lastName || ""}`.trim();
    const matchSearch =
      !search ||
      `${empName} ${rec.violation}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || rec.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disciplinary / NTE</h1>
          <p className="text-muted-foreground">
            {records.length} total records
          </p>
        </div>
        {canManage && (
          <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Issue NTE
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue Notice to Explain</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleIssueNTE} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <select
                    value={nteForm.employeeId}
                    onChange={(e) => setNteForm({ ...nteForm, employeeId: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Select employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeNo})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Violation</Label>
                  <Input
                    value={nteForm.violation}
                    onChange={(e) => setNteForm({ ...nteForm, violation: e.target.value })}
                    placeholder="Brief violation summary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={nteForm.description}
                    onChange={(e) => setNteForm({ ...nteForm, description: e.target.value })}
                    placeholder="Detailed description of the incident..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <select
                    value={nteForm.severity}
                    onChange={(e) => setNteForm({ ...nteForm, severity: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {severityOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={issueMutation.isPending} className="w-full">
                  {issueMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Issue NTE
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee or violation..."
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
                  {s === "All" ? "All Statuses" : s.replace("_", " ")}
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
            <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No disciplinary records found</h3>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "All"
                ? "Try adjusting your filters."
                : "No NTEs have been issued yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Employee</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Violation</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Severity</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Date Issued</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Deadline</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => {
                  const empName = rec.employeeName || `${rec.firstName || ""} ${rec.lastName || ""}`.trim() || `Employee #${rec.employeeId}`;
                  return (
                    <tr
                      key={rec.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{empName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {rec.violation}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            rec.severity === "Grave"
                              ? "bg-red-100 text-red-700"
                              : rec.severity === "Major"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {rec.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {formatDate(rec.dateIssued)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                        {rec.deadline ? formatDate(rec.deadline) : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rec.status)}`}
                        >
                          {rec.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/disciplinary/${rec.id}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
