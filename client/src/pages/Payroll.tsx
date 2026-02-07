import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getStatusColor, getInitials, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  Loader2,
  Plus,
  DollarSign,
  CheckCircle,
  Send,
  FileText,
  Calendar,
} from "lucide-react";

interface PayrollPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  payDate: string;
  status: string;
  createdAt: string;
}

interface PayrollRecord {
  id: number;
  employeeId: number;
  periodId: number;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
  daysWorked: number | string;
  basicPay: number | string;
  overtimePay: number | string;
  holidayPay: number | string;
  grossPay: number | string;
  totalDeductions: number | string;
  netPay: number | string;
  status: string;
}

export default function Payroll() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    payDate: "",
  });

  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  const { data: periods = [], isLoading: loadingPeriods } = useQuery<PayrollPeriod[]>({
    queryKey: ["/api/payroll/periods"],
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery<PayrollRecord[]>({
    queryKey: [`/api/payroll?periodId=${selectedPeriodId}`],
    enabled: !!selectedPeriodId,
  });

  const createPeriodMutation = useMutation({
    mutationFn: async (data: typeof periodForm) => {
      const res = await apiRequest("POST", "/api/payroll/periods", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] });
      toast({ title: "Payroll period created", variant: "success" });
      setShowCreatePeriod(false);
      setPeriodForm({ name: "", startDate: "", endDate: "", payDate: "" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (periodId: number) => {
      const res = await apiRequest("POST", `/api/payroll/generate`, { periodId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll?periodId=${selectedPeriodId}`] });
      toast({ title: "Payroll generated successfully", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/payroll/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll?periodId=${selectedPeriodId}`] });
      toast({ title: "Payroll approved", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/payroll/${id}/release`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll?periodId=${selectedPeriodId}`] });
      toast({ title: "Payroll released", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleCreatePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodForm.name || !periodForm.startDate || !periodForm.endDate || !periodForm.payDate) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createPeriodMutation.mutate(periodForm);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Management</h1>
          <p className="text-muted-foreground">Process and manage employee payroll</p>
        </div>
      </div>

      {/* Payroll Periods Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Payroll Periods
          </CardTitle>
          {canManage && (
            <Dialog open={showCreatePeriod} onOpenChange={setShowCreatePeriod}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Period
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payroll Period</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePeriod} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Period Name</Label>
                    <Input
                      value={periodForm.name}
                      onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                      placeholder="e.g., January 1-15, 2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={periodForm.startDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={periodForm.endDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay Date</Label>
                    <Input
                      type="date"
                      value={periodForm.payDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, payDate: e.target.value })}
                    />
                  </div>
                  <Button type="submit" disabled={createPeriodMutation.isPending} className="w-full">
                    {createPeriodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Period
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {loadingPeriods ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payroll periods yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {periods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriodId(period.id)}
                  className={cn(
                    "text-left p-3 rounded-lg border transition-colors",
                    selectedPeriodId === period.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{period.name}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(period.status)}`}
                    >
                      {period.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(period.startDate)} - {formatDate(period.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pay date: {formatDate(period.payDate)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payroll Records Section */}
      {selectedPeriodId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payroll Records
            </CardTitle>
            {canManage && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => generateMutation.mutate(selectedPeriodId)}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generate Payroll
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No payroll records for this period. Click "Generate Payroll" to create them.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Employee</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Days Worked</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Basic Pay</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">OT Pay</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Gross</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Deductions</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Net Pay</th>
                      <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                      {canManage && (
                        <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const empName = rec.employeeName || `${rec.firstName || ""} ${rec.lastName || ""}`.trim() || `Employee #${rec.employeeId}`;
                      return (
                        <tr key={rec.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/payroll/${rec.id}`}>
                              <span className="text-sm font-medium cursor-pointer hover:underline">{empName}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{rec.daysWorked}</td>
                          <td className="px-4 py-3 text-sm text-right hidden md:table-cell">
                            {formatCurrency(rec.basicPay)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right hidden md:table-cell">
                            {formatCurrency(rec.overtimePay)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right hidden lg:table-cell">
                            {formatCurrency(rec.grossPay)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right hidden lg:table-cell">
                            {formatCurrency(rec.totalDeductions)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(rec.netPay)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(rec.status)}`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          {canManage && (
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                {rec.status === "DRAFT" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 h-7 text-xs"
                                    onClick={() => approveMutation.mutate(rec.id)}
                                    disabled={approveMutation.isPending}
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Approve
                                  </Button>
                                )}
                                {rec.status === "APPROVED" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 h-7 text-xs"
                                    onClick={() => releaseMutation.mutate(rec.id)}
                                    disabled={releaseMutation.isPending}
                                  >
                                    <Send className="h-3 w-3" />
                                    Release
                                  </Button>
                                )}
                                <Link href={`/payroll/${rec.id}`}>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
