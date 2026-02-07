import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, getStatusColor } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ListTodo,
  Plus,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  User,
  AlertCircle,
  X,
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
  assignee?: {
    firstName: string;
    lastName: string;
  };
}

const columns = [
  { key: "Todo", label: "To Do", color: "border-gray-300" },
  { key: "In_Progress", label: "In Progress", color: "border-blue-400" },
  { key: "Blocked", label: "Blocked", color: "border-red-400" },
  { key: "Done", label: "Done", color: "border-emerald-400" },
];

const columnOrder = ["Todo", "In_Progress", "Blocked", "Done"];

const priorityColors: Record<string, string> = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "Medium", dueDate: "" });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tasks", {
        ...newTask,
        status: "Todo",
        dueDate: newTask.dueDate || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created", variant: "success" });
      setShowNewForm(false);
      setNewTask({ title: "", description: "", priority: "Medium", dueDate: "" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const moveTask = (taskId: number, currentStatus: string, direction: "left" | "right") => {
    const currentIdx = columnOrder.indexOf(currentStatus);
    const newIdx = direction === "right" ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= columnOrder.length) return;
    updateStatus.mutate({ taskId, status: columnOrder[newIdx] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">{tasks.length} total tasks</p>
        </div>
        <Button className="gap-2" onClick={() => setShowNewForm(true)}>
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* New Task Form */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Create New Task</CardTitle>
              <button onClick={() => setShowNewForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <Button
              onClick={() => createTask.mutate()}
              disabled={!newTask.title || createTask.isPending}
            >
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          const colIdx = columnOrder.indexOf(col.key);
          return (
            <div key={col.key} className="space-y-3">
              <div className={`flex items-center gap-2 px-1 py-2 border-b-2 ${col.color}`}>
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <Card key={task.id} className="shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <Link href={`/tasks/${task.id}`}>
                          <p className="text-sm font-medium hover:text-primary cursor-pointer leading-tight">
                            {task.title}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[task.priority] || "bg-gray-100 text-gray-700"}`}
                          >
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                        {task.assignee && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3" />
                            {task.assignee.firstName} {task.assignee.lastName}
                          </div>
                        )}
                        {/* Move buttons */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => moveTask(task.id, task.status, "left")}
                            disabled={colIdx === 0}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => moveTask(task.id, task.status, "right")}
                            disabled={colIdx === columnOrder.length - 1}
                            className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
