import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const leaveFormSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

function calculateWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (endDate < startDate) return 0;
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export default function LeaveForm() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: { leaveTypeId: "", startDate: "", endDate: "", reason: "" },
  });

  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const watchLeaveType = form.watch("leaveTypeId");
  const workingDays = calculateWorkingDays(watchStartDate, watchEndDate);

  const { data: leaveTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/leave-types"],
  });

  const { data: allocations = [] } = useQuery<any[]>({
    queryKey: ["/api/leave-allocations", user?.employeeId],
    enabled: !!user?.employeeId,
  });

  const selectedAllocation = allocations.find(
    (a: any) => a.leaveTypeId?.toString() === watchLeaveType
  );
  const remainingBalance = selectedAllocation
    ? selectedAllocation.allocated - (selectedAllocation.used || 0)
    : null;

  const createMutation = useMutation({
    mutationFn: async (data: LeaveFormValues) => {
      return apiRequest("/api/leave-requests", {
        method: "POST",
        body: JSON.stringify({
          leaveTypeId: parseInt(data.leaveTypeId),
          startDate: data.startDate,
          endDate: data.endDate,
          totalDays: workingDays,
          reason: data.reason,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Leave request submitted successfully" });
      navigate("/leave-requests");
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit leave request", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: LeaveFormValues) => {
    if (remainingBalance !== null && workingDays > remainingBalance) {
      toast({ title: "Insufficient leave balance", variant: "destructive" });
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Leave Request</h1>
          <p className="text-muted-foreground">Submit a new leave request for approval</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/leave-requests")}>Cancel</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Leave Details</CardTitle>
              <CardDescription>Fill in the details for your leave request</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveTypeId">Leave Type</Label>
                  <Select
                    value={form.watch("leaveTypeId")}
                    onValueChange={(value) => form.setValue("leaveTypeId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type: any) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name} {type.paid ? "(Paid)" : "(Unpaid)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.leaveTypeId && (
                    <p className="text-sm text-destructive">{form.formState.errors.leaveTypeId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input type="date" {...form.register("startDate")} />
                    {form.formState.errors.startDate && (
                      <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input type="date" {...form.register("endDate")} />
                    {form.formState.errors.endDate && (
                      <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>

                {workingDays > 0 && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm">
                      Working days: <span className="font-semibold">{workingDays} day(s)</span>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    {...form.register("reason")}
                    placeholder="Please provide a detailed reason for your leave request..."
                    rows={4}
                  />
                  {form.formState.errors.reason && (
                    <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Submitting..." : "Submit Leave Request"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/leave-requests")}>
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
              <CardTitle className="text-lg">Leave Balance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave allocations found</p>
              ) : (
                allocations.map((alloc: any) => (
                  <div key={alloc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{alloc.leaveTypeName || "Leave"}</p>
                      <p className="text-xs text-muted-foreground">
                        Used: {alloc.used || 0} / {alloc.allocated}
                      </p>
                    </div>
                    <Badge variant={alloc.allocated - (alloc.used || 0) > 0 ? "default" : "destructive"}>
                      {alloc.allocated - (alloc.used || 0)} left
                    </Badge>
                  </div>
                ))
              )}

              {remainingBalance !== null && watchLeaveType && (
                <div className="mt-4 p-3 rounded-md bg-muted">
                  <p className="text-sm font-medium">Selected Type Balance</p>
                  <p className="text-2xl font-bold">{remainingBalance} days</p>
                  {workingDays > 0 && workingDays > remainingBalance && (
                    <p className="text-xs text-destructive mt-1">Insufficient balance for {workingDays} days</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
