import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Send,
  Printer,
  DollarSign,
  TrendingDown,
} from "lucide-react";

interface PayrollDetail {
  id: number;
  employeeId: number;
  periodId: number;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
  employeeNo?: string;
  position?: string;
  department?: string;
  periodName?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  daysWorked: number | string;
  basicPay: number | string;
  overtimePay: number | string;
  holidayPay: number | string;
  grossPay: number | string;
  sssDeduction: number | string;
  philhealthDeduction: number | string;
  pagibigDeduction: number | string;
  taxDeduction: number | string;
  cashAdvanceDeduction: number | string;
  lateDeduction: number | string;
  totalDeductions: number | string;
  netPay: number | string;
  status: string;
  createdAt?: string;
}

export default function PayrollDetailPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const id = location.split("/payroll/")[1]?.split("/")[0];
  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  const { data: payroll, isLoading } = useQuery<PayrollDetail>({
    queryKey: [`/api/payroll/${id}`],
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/payroll/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll/${id}`] });
      toast({ title: "Payroll approved", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/payroll/${id}/release`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payroll/${id}`] });
      toast({ title: "Payroll released", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Payroll record not found</h2>
        <Link href="/payroll">
          <Button variant="outline">Back to Payroll</Button>
        </Link>
      </div>
    );
  }

  const empName = payroll.employeeName || `${payroll.firstName || ""} ${payroll.lastName || ""}`.trim() || `Employee #${payroll.employeeId}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/payroll">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Payroll Detail</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{empName}</span>
            {payroll.employeeNo && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span>{payroll.employeeNo}</span>
              </>
            )}
            <span
              className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payroll.status)}`}
            >
              {payroll.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/payslip/${id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Printer className="h-4 w-4" />
              Payslip
            </Button>
          </Link>
          {canManage && payroll.status === "DRAFT" && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve
            </Button>
          )}
          {canManage && payroll.status === "APPROVED" && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => releaseMutation.mutate()}
              disabled={releaseMutation.isPending}
            >
              {releaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Release
            </Button>
          )}
        </div>
      </div>

      {/* Period Info */}
      {(payroll.periodName || payroll.periodStartDate) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              {payroll.periodName && (
                <div>
                  <span className="text-muted-foreground">Period:</span>{" "}
                  <span className="font-medium">{payroll.periodName}</span>
                </div>
              )}
              {payroll.periodStartDate && payroll.periodEndDate && (
                <div>
                  <span className="text-muted-foreground">Coverage:</span>{" "}
                  <span className="font-medium">
                    {formatDate(payroll.periodStartDate)} - {formatDate(payroll.periodEndDate)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Days Worked:</span>{" "}
                <span className="font-medium">{payroll.daysWorked}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Basic Pay</span>
              <span className="font-medium">{formatCurrency(payroll.basicPay)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overtime Pay</span>
              <span className="font-medium">{formatCurrency(payroll.overtimePay)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Holiday Pay</span>
              <span className="font-medium">{formatCurrency(payroll.holidayPay)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Gross Pay</span>
              <span className="text-emerald-600">{formatCurrency(payroll.grossPay)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Deductions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SSS</span>
              <span className="font-medium">{formatCurrency(payroll.sssDeduction)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">PhilHealth</span>
              <span className="font-medium">{formatCurrency(payroll.philhealthDeduction)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pag-IBIG</span>
              <span className="font-medium">{formatCurrency(payroll.pagibigDeduction)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium">{formatCurrency(payroll.taxDeduction)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cash Advance</span>
              <span className="font-medium">{formatCurrency(payroll.cashAdvanceDeduction)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Late/Undertime</span>
              <span className="font-medium">{formatCurrency(payroll.lateDeduction)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Total Deductions</span>
              <span className="text-red-600">{formatCurrency(payroll.totalDeductions)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Pay */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Pay</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(payroll.netPay)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-primary/20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
