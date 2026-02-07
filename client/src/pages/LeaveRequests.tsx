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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Calendar,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number | string;
  reason?: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

const statusTabs = ["All", "Pending", "Approved", "Rejected", "Cancelled"];

export default function LeaveRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/leave-requests/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Leave request approved", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("PUT", `/api/leave-requests/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      toast({ title: "Leave request rejected", variant: "success" });
      setShowRejectDialog(false);
      setRejectingId(null);
      setRejectionReason("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    if (!rejectionReason.trim()) {
      toast({ title: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }
    rejectMutation.mutate({ id: rejectingId, reason: rejectionReason });
  };

  const openRejectDialog = (id: number) => {
    setRejectingId(id);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const filtered = requests.filter((req) => {
    const empName = req.employeeName || `${req.firstName || ""} ${req.lastName || ""}`.trim();
    const matchSearch =
      !search ||
      `${empName} ${req.leaveType}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || req.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Requests</h1>
          <p className="text-muted-foreground">
            {requests.length} total requests
          </p>
        </div>
        <Link href="/leave-requests/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee or leave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
              {tab !== "All" && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({requests.filter((r) => r.status === tab).length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Rejection</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejecting this leave request..."
                rows={3}
              />
            </div>
            <Button type="submit" variant="destructive" disabled={rejectMutation.isPending} className="w-full">
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No leave requests found</h3>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "All"
                ? "Try adjusting your filters."
                : "No leave requests have been submitted yet."}
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
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Leave Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Start Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">End Date</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Days</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  {canManage && (
                    <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const empName = req.employeeName || `${req.firstName || ""} ${req.lastName || ""}`.trim() || `Employee #${req.employeeId}`;
                  return (
                    <tr
                      key={req.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{empName}</td>
                      <td className="px-4 py-3 text-sm">{req.leaveType}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {formatDate(req.startDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {formatDate(req.endDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{req.totalDays}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}
                        >
                          {req.status}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          {req.status === "Pending" && (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-xs"
                                onClick={() => approveMutation.mutate(req.id)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 h-7 text-xs text-red-600 hover:text-red-700"
                                onClick={() => openRejectDialog(req.id)}
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
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
