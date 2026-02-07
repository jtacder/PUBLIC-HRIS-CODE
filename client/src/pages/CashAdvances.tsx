import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CashAdvances() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [monthlyDeduction, setMonthlyDeduction] = useState("");
  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  const { data: cashAdvances = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/cash-advances", statusFilter],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/cash-advances", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(amount),
          purpose,
          monthlyDeduction: parseFloat(monthlyDeduction),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-advances"] });
      toast({ title: "Cash advance request submitted" });
      setDialogOpen(false);
      setAmount("");
      setPurpose("");
      setMonthlyDeduction("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit request", description: error.message, variant: "destructive" });
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) => {
      return apiRequest(`/api/cash-advances/${id}/${action}`, { method: "PUT" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-advances"] });
      toast({ title: "Cash advance updated" });
    },
  });

  const filtered = statusFilter === "all"
    ? cashAdvances
    : cashAdvances.filter((ca: any) => ca.status === statusFilter);

  const totalPending = cashAdvances.filter((ca: any) => ca.status === "pending").reduce((sum: number, ca: any) => sum + Number(ca.amount || 0), 0);
  const totalApproved = cashAdvances.filter((ca: any) => ca.status === "approved" || ca.status === "disbursed").reduce((sum: number, ca: any) => sum + Number(ca.amount || 0), 0);

  const repayMonths = amount && monthlyDeduction && parseFloat(monthlyDeduction) > 0
    ? Math.ceil(parseFloat(amount) / parseFloat(monthlyDeduction))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cash Advances</h1>
          <p className="text-muted-foreground">Manage cash advance requests and repayments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Request Cash Advance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Cash Advance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (₱)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea
                  placeholder="Reason for cash advance..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Deduction (₱)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={monthlyDeduction}
                  onChange={(e) => setMonthlyDeduction(e.target.value)}
                />
              </div>
              {repayMonths > 0 && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm">Repayment period: <span className="font-semibold">{repayMonths} month(s)</span></p>
                </div>
              )}
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !amount || !purpose || !monthlyDeduction}
                className="w-full"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Active/Disbursed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalApproved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cashAdvances.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Monthly Deduction</TableHead>
                <TableHead>Date Requested</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No cash advance requests found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ca: any) => (
                  <TableRow key={ca.id}>
                    <TableCell className="font-medium">{ca.employeeName || `Employee #${ca.employeeId}`}</TableCell>
                    <TableCell>{formatCurrency(Number(ca.amount))}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ca.purpose}</TableCell>
                    <TableCell>{formatCurrency(Number(ca.monthlyDeduction || 0))}</TableCell>
                    <TableCell>{formatDate(ca.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ca.status)}>{ca.status}</Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          {ca.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => actionMutation.mutate({ id: ca.id, action: "approve" })}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => actionMutation.mutate({ id: ca.id, action: "reject" })}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {ca.status === "approved" && (
                            <Button
                              size="sm"
                              onClick={() => actionMutation.mutate({ id: ca.id, action: "disburse" })}
                            >
                              Disburse
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
