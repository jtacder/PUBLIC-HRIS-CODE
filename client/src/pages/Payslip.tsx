import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

interface PayslipData {
  id: number;
  employeeId: number;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
  employeeNo?: string;
  position?: string;
  department?: string;
  periodName?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  payDate?: string;
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
}

export default function Payslip() {
  const [location] = useLocation();

  // Support both /payslip/:id and /payslips/:id
  const idMatch = location.match(/\/payslips?\/(\d+)/);
  const id = idMatch?.[1];

  // Try fetching from payslips endpoint first, fallback to payroll
  const { data: payslip, isLoading } = useQuery<PayslipData>({
    queryKey: [`/api/payroll/${id}`],
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!payslip) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Payslip not found</h2>
        <Link href="/payroll">
          <Button variant="outline">Back to Payroll</Button>
        </Link>
      </div>
    );
  }

  const empName = payslip.employeeName || `${payslip.firstName || ""} ${payslip.lastName || ""}`.trim() || `Employee #${payslip.employeeId}`;

  return (
    <div className="space-y-4">
      {/* Screen-only controls */}
      <div className="flex items-center gap-4 print:hidden">
        <Link href={`/payroll/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Payslip</h1>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Payslip Content - Print-friendly */}
      <div className="max-w-2xl mx-auto bg-white border rounded-lg p-8 print:border-0 print:shadow-none print:p-0 print:max-w-full">
        {/* Company Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wider">Company Name</h2>
          <p className="text-sm text-muted-foreground">Payslip / Pay Statement</p>
          {payslip.periodName && (
            <p className="text-sm font-medium mt-1">{payslip.periodName}</p>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Employee Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-muted-foreground">Employee Name</p>
            <p className="font-medium">{empName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Employee No.</p>
            <p className="font-medium">{payslip.employeeNo || "--"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Position</p>
            <p className="font-medium">{payslip.position || "--"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department</p>
            <p className="font-medium">{payslip.department || "--"}</p>
          </div>
          {payslip.periodStartDate && payslip.periodEndDate && (
            <div>
              <p className="text-muted-foreground">Pay Period</p>
              <p className="font-medium">
                {formatDate(payslip.periodStartDate)} - {formatDate(payslip.periodEndDate)}
              </p>
            </div>
          )}
          {payslip.payDate && (
            <div>
              <p className="text-muted-foreground">Pay Date</p>
              <p className="font-medium">{formatDate(payslip.payDate)}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Days Worked</p>
            <p className="font-medium">{payslip.daysWorked}</p>
          </div>
        </div>

        <Separator className="mb-6" />

        {/* Two-column layout: Earnings | Deductions */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Earnings */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-emerald-700">
              Earnings
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Pay</span>
                <span>{formatCurrency(payslip.basicPay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overtime Pay</span>
                <span>{formatCurrency(payslip.overtimePay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Holiday Pay</span>
                <span>{formatCurrency(payslip.holidayPay)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Gross Pay</span>
                <span>{formatCurrency(payslip.grossPay)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-red-700">
              Deductions
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SSS</span>
                <span>{formatCurrency(payslip.sssDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PhilHealth</span>
                <span>{formatCurrency(payslip.philhealthDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pag-IBIG</span>
                <span>{formatCurrency(payslip.pagibigDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(payslip.taxDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cash Advance</span>
                <span>{formatCurrency(payslip.cashAdvanceDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Late/Undertime</span>
                <span>{formatCurrency(payslip.lateDeduction)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Deductions</span>
                <span>{formatCurrency(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Net Pay */}
        <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-lg font-bold">NET PAY</span>
          <span className="text-2xl font-bold text-primary">{formatCurrency(payslip.netPay)}</span>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-xs text-muted-foreground text-center">
          <p>This is a system-generated payslip. If you have any questions, please contact HR.</p>
        </div>
      </div>
    </div>
  );
}
