import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export default function Devotionals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "", scriptureReference: "", content: "", date: new Date().toISOString().split("T")[0],
  });

  const { data: devotionals = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/devotionals"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/devotionals", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devotionals"] });
      toast({ title: "Devotional published" });
      setDialogOpen(false);
      setFormData({ title: "", scriptureReference: "", content: "", date: new Date().toISOString().split("T")[0] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to publish", description: error.message, variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (devotionalId: number) => {
      return apiRequest(`/api/devotionals/${devotionalId}/read`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devotionals"] });
      toast({ title: "Marked as read" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devotionals</h1>
          <p className="text-muted-foreground">Daily spiritual encouragement and reflection</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Devotional</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Devotional</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Devotional title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scripture Reference</Label>
                  <Input
                    value={formData.scriptureReference}
                    onChange={(e) => setFormData({ ...formData, scriptureReference: e.target.value })}
                    placeholder="e.g., Philippians 4:13"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Write the devotional content..."
                    rows={8}
                  />
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !formData.title || !formData.content}
                  className="w-full"
                >
                  {createMutation.isPending ? "Publishing..." : "Publish Devotional"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/4 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : devotionals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No devotionals published yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {devotionals.map((devotional: any) => (
            <Card
              key={devotional.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setExpandedId(expandedId === devotional.id ? null : devotional.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{devotional.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {devotional.scriptureReference && (
                        <span className="font-medium italic">{devotional.scriptureReference}</span>
                      )}
                      {devotional.scriptureReference && " • "}
                      {formatDate(devotional.date || devotional.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {devotional.isRead && (
                      <Badge variant="secondary">Read</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {expandedId === devotional.id ? (
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{devotional.content}</p>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Posted by {devotional.authorName || "Admin"} • {formatDate(devotional.createdAt)}
                      </p>
                      {!devotional.isRead && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(devotional.id);
                          }}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground line-clamp-2">{devotional.content}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
