import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, getStatusColor, getInitials, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  FolderKanban,
  MessageSquare,
  Send,
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: number;
  projectId?: number;
  createdAt?: string;
  updatedAt?: string;
  assignee?: {
    id: number;
    firstName: string;
    lastName: string;
    position?: string;
  };
  project?: {
    id: number;
    name: string;
    code: string;
  };
}

interface Comment {
  id: number;
  taskId: number;
  userId: number;
  content: string;
  createdAt: string;
  user?: {
    id: number;
    email: string;
    employeeId?: number;
  };
  employee?: {
    firstName: string;
    lastName: string;
  };
}

const statusOptions = ["Todo", "In_Progress", "Blocked", "Done"];
const priorityOptions = ["Low", "Medium", "High", "Critical"];

const priorityColors: Record<string, string> = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

export default function TaskDetail() {
  const [location] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const id = location.split("/tasks/")[1]?.split("/")[0];

  const [commentText, setCommentText] = useState("");

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: [`/api/tasks/${id}`],
    enabled: !!id,
  });

  const { data: comments = [], isLoading: loadingComments } = useQuery<Comment[]>({
    queryKey: [`/api/tasks/${id}/comments`],
    enabled: !!id,
  });

  const updateTask = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated", variant: "success" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const postComment = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/tasks/${id}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${id}/comments`] });
      toast({ title: "Comment added", variant: "success" });
      setCommentText("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    postComment.mutate(commentText.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold mb-2">Task not found</h2>
        <Link href="/tasks">
          <Button variant="outline">Back to Tasks</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={cn(getStatusColor(task.status))}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge className={cn(priorityColors[task.priority] || "bg-gray-100 text-gray-700")}>
              {task.priority}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment Form */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!commentText.trim() || postComment.isPending}
                >
                  {postComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => {
                    const authorName = comment.employee
                      ? `${comment.employee.firstName} ${comment.employee.lastName}`
                      : comment.user?.email || "Unknown";
                    const initials = comment.employee
                      ? getInitials(comment.employee.firstName, comment.employee.lastName)
                      : authorName.charAt(0).toUpperCase();
                    return (
                      <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  value={task.status}
                  onChange={(e) => updateTask.mutate({ status: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  disabled={updateTask.isPending}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <select
                  value={task.priority}
                  onChange={(e) => updateTask.mutate({ priority: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  disabled={updateTask.isPending}
                >
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Assignee</Label>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {getInitials(task.assignee.firstName, task.assignee.lastName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </p>
                      {task.assignee.position && (
                        <p className="text-xs text-muted-foreground">{task.assignee.position}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Unassigned</span>
                  </div>
                )}
              </div>

              {/* Project */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Project</Label>
                {task.project ? (
                  <Link href={`/projects/${task.project.id}`}>
                    <div className="flex items-center gap-2 text-sm hover:text-primary cursor-pointer">
                      <FolderKanban className="h-4 w-4" />
                      <span>{task.project.name}</span>
                      <span className="text-xs text-muted-foreground">({task.project.code})</span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderKanban className="h-4 w-4" />
                    <span>No project</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Due Date</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</span>
                </div>
              </div>

              {/* Timestamps */}
              {task.createdAt && (
                <div className="pt-3 border-t space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Created: {formatDate(task.createdAt)}
                  </p>
                  {task.updatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Updated: {formatDate(task.updatedAt)}
                    </p>
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
