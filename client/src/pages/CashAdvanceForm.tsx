import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const cashAdvanceSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((v) => parseFloat(v) > 0, "Amount must be positive"),
  purpose: z.string().min(10, "Purpose must be at least 10 characters"),
  monthlyDeduction: z.string().min(1, "Monthly deduction is required").refine((v) => parseFloat(v) > 0, "Must be positive"),
  acknowledged: z.boolean().refine((v) => v === true, "You must acknowledge the terms"),
});

type CashAdvanceFormValues = z.infer<typeof cashAdvanceSchema>;

export default function CashAdvanceForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CashAdvanceFormValues>({
    resolver: zodResolver(cashAdvanceSchema),
    defaultValues: { amount: "", purpose: "", monthlyDeduction: "", acknowledged: false },
  });

  const watchAmount = form.watch("amount");
  const watchDeduction = form.watch("monthlyDeduction");
  const repayMonths =
    watchAmount && watchDeduction && parseFloat(watchDeduction) > 0
      ? Math.ceil(parseFloat(watchAmount) / parseFloat(watchDeduction))
      : 0;

  const createMutation = useMutation({
    mutationFn: async (data: CashAdvanceFormValues) => {
      return apiRequest("/api/cash-advances", {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(data.amount),
          purpose: data.purpose,
          monthlyDeduction: parseFloat(data.monthlyDeduction),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash-advances"] });
      toast({ title: "Cash advance request submitted successfully" });
      navigate("/cash-advances");
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: CashAdvanceFormValues) => {
    if (parseFloat(data.monthlyDeduction) >= parseFloat(data.amount)) {
      toast({ title: "Monthly deduction must be less than total amount", variant: "destructive" });
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Cash Advance</h1>
          <p className="text-muted-foreground">Submit a cash advance request for payroll deduction</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/cash-advances")}>Cancel</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cash Advance Details</CardTitle>
              <CardDescription>The amount will be deducted from your future payroll</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("amount")}
                  />
                  {form.formState.errors.amount && (
                    <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose / Reason</Label>
                  <Textarea
                    {...form.register("purpose")}
                    placeholder="Please describe the reason for your cash advance request..."
                    rows={4}
                  />
                  {form.formState.errors.purpose && (
                    <p className="text-sm text-destructive">{form.formState.errors.purpose.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyDeduction">Preferred Monthly Deduction (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("monthlyDeduction")}
                  />
                  {form.formState.errors.monthlyDeduction && (
                    <p className="text-sm text-destructive">{form.formState.errors.monthlyDeduction.message}</p>
                  )}
                </div>

                {repayMonths > 0 && (
                  <div className="rounded-md bg-muted p-4">
                    <p className="text-sm font-medium">Repayment Summary</p>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="font-semibold">{formatCurrency(parseFloat(watchAmount))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Deduction</p>
                        <p className="font-semibold">{formatCurrency(parseFloat(watchDeduction))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Months to Repay</p>
                        <p className="font-semibold">{repayMonths} month(s)</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 pt-2">
                  <Checkbox
                    id="acknowledged"
                    checked={form.watch("acknowledged")}
                    onCheckedChange={(checked) => form.setValue("acknowledged", checked === true)}
                  />
                  <Label htmlFor="acknowledged" className="text-sm leading-relaxed">
                    I acknowledge that this cash advance will be deducted from my future payroll and I agree
                    to the repayment terms specified above.
                  </Label>
                </div>
                {form.formState.errors.acknowledged && (
                  <p className="text-sm text-destructive">{form.formState.errors.acknowledged.message}</p>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/cash-advances")}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Cash advances are subject to the following terms:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Maximum amount is based on your monthly salary</li>
                <li>Deductions start on the next payroll cycle after approval</li>
                <li>Monthly deduction must be less than the total amount</li>
                <li>Only one active cash advance is allowed at a time</li>
                <li>Approval is subject to HR and management review</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
