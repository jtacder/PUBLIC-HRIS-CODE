import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, getStatusColor } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  Scale,
} from "lucide-react";

interface DisciplinaryRecord {
  id: number;
  employeeId: number;
  employeeName?: string;
  firstName?: string;
  lastName?: string;
  employeeNo?: string;
  violation: string;
  description?: string;
  severity: string;
  dateIssued: string;
  deadline?: string;
  status: string;
  explanation?: string;
  explanationDate?: string;
  sanction?: string;
  sanctionDetails?: string;
  resolvedDate?: string;
  resolvedBy?: string;
  createdAt: string;
}

const sanctionOptions = [
  "Verbal Warning",
  "Written Warning",
  "Suspension",
  "Termination",
];

export default function DisciplinaryDetailPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const id = location.split("/disciplinary/")[1]?.split("/")[0];
  const canManage = user?.role === "ADMIN" || user?.role === "HR" || user?.isSuperadmin;

  const [explanation, setExplanation] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveForm, setResolveForm] = useState({
    sanction: "Verbal Warning",
    sanctionDetails: "",
  });

  const { data: record, isLoading } = useQuery<DisciplinaryRecord>({
    queryKey: [`/api/disciplinary/${id}`],
    enabled: !!id,
  });

  const submitExplanationMutation = useMutation({
    mutationFn: async (explanationText: string) => {
      const res = await apiRequest("PUT", `/api/disciplinary/${id}/explain`, {
        explanation: explanationText,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/disciplinary/${id}`] });
      toast({ title: "Explanation submitted", variant: "success" });
      setExplanation("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: typeof resolveForm) => {
      const res = await apiRequest("PUT", `/api/disciplinary/${id}/resolve`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/disciplinary/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/disciplinary"] });
      toast({ title: "NTE resolved", variant: "success" });
      setShowResolveDialog(false);
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleSubmitExplanation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      toast({ title: "Please enter your explanation", variant: "destructive" });
      return;
    }
    submitExplanationMutation.mutate(explanation);
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    resolveMutation.mutate(resolveForm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Record not found</h2>
        <Link href="/disciplinary">
          <Button variant="outline">Back to Disciplinary</Button>
        </Link>
      </div>
    );
  }

  const empName = record.employeeName || `${record.firstName || ""} ${record.lastName || ""}`.trim() || `Employee #${record.employeeId}`;
  const isEmployee = user?.employeeId === record.employeeId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/disciplinary">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">NTE Detail</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{empName}</span>
            {record.employeeNo && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span>{record.employeeNo}</span>
              </>
            )}
            <span
              className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}
            >
              {record.status.replace("_", " ")}
            </span>
          </div>
        </div>
        {canManage && record.status !== "Resolved" && (
          <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Scale className="h-4 w-4" />
                Resolve
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolve NTE</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleResolve} className="space-y-4">
                <div className="space-y-2">
                  <Label>Sanction</Label>
                  <select
                    value={resolveForm.sanction}
                    onChange={(e) => setResolveForm({ ...resolveForm, sanction: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {sanctionOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Details / Remarks</Label>
                  <Textarea
                    value={resolveForm.sanctionDetails}
                    onChange={(e) => setResolveForm({ ...resolveForm, sanctionDetails: e.target.value })}
                    placeholder="Additional details about the sanction..."
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={resolveMutation.isPending} className="w-full">
                  {resolveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Resolve with Sanction
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Violation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Violation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Violation</p>
              <p className="text-sm font-medium">{record.violation}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Severity</p>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  record.severity === "Grave"
                    ? "bg-red-100 text-red-700"
                    : record.severity === "Major"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {record.severity}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date Issued</p>
              <p className="text-sm font-medium">{formatDate(record.dateIssued)}</p>
            </div>
            {record.deadline && (
              <div>
                <p className="text-xs text-muted-foreground">Deadline for Explanation</p>
                <p className="text-sm font-medium">{formatDate(record.deadline)}</p>
              </div>
            )}
          </div>
          {record.description && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Full Description</p>
                <p className="text-sm whitespace-pre-wrap">{record.description}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Explanation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Explanation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {record.explanation ? (
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{record.explanation}</p>
              </div>
              {record.explanationDate && (
                <p className="text-xs text-muted-foreground">
                  Submitted on {formatDate(record.explanationDate)}
                </p>
              )}
            </div>
          ) : record.status === "Issued" && isEmployee ? (
            <form onSubmit={handleSubmitExplanation} className="space-y-3">
              <Textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Write your explanation here..."
                rows={5}
              />
              <Button type="submit" disabled={submitExplanationMutation.isPending} className="gap-2">
                {submitExplanationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
                Submit Explanation
              </Button>
            </form>
          ) : (
            <div className="text-center py-6">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No explanation submitted yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution (if resolved) */}
      {record.status === "Resolved" && record.sanction && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              Resolution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Sanction</p>
                <p className="text-sm font-medium">{record.sanction}</p>
              </div>
              {record.resolvedDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Resolved Date</p>
                  <p className="text-sm font-medium">{formatDate(record.resolvedDate)}</p>
                </div>
              )}
              {record.resolvedBy && (
                <div>
                  <p className="text-xs text-muted-foreground">Resolved By</p>
                  <p className="text-sm font-medium">{record.resolvedBy}</p>
                </div>
              )}
            </div>
            {record.sanctionDetails && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Details</p>
                  <p className="text-sm whitespace-pre-wrap">{record.sanctionDetails}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
