import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase, type TaskStatus } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskActions } from "@/components/TaskActions";
import { TaskHistoryList } from "@/components/TaskHistoryList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string;
  created_at: string;
  construction_site_id: string;
  site: { id: string; name: string } | null;
  assignee: { full_name: string | null; email: string } | null;
  author: { full_name: string | null; email: string } | null;
};

type HistoryEntry = {
  id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  changed_at: string;
  comment: string | null;
  changed_by_user: { full_name: string | null; email: string } | null;
};

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    const [taskRes, historyRes] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          `id, title, description, status, assignee_id, created_at, construction_site_id,
           site:construction_sites(id, name),
           assignee:users!tasks_assignee_id_fkey(full_name, email),
           author:users!tasks_created_by_fkey(full_name, email)`,
        )
        .eq("id", taskId)
        .maybeSingle(),
      supabase
        .from("task_history")
        .select(
          `id, from_status, to_status, changed_at, comment,
           changed_by_user:users!task_history_changed_by_fkey(full_name, email)`,
        )
        .eq("task_id", taskId)
        .order("changed_at", { ascending: true }),
    ]);
    setLoading(false);
    if (taskRes.error) {
      toast.error(taskRes.error.message);
      return;
    }
    if (historyRes.error) {
      toast.error(historyRes.error.message);
      return;
    }
    setTask(taskRes.data as Task | null);
    setHistory((historyRes.data as HistoryEntry[]) ?? []);
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!task) return <p className="text-muted-foreground">Task not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        {task.site && (
          <Link
            to={`/sites/${task.site.id}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {task.site.name}
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <StatusBadge status={task.status} />
                <span>
                  by {task.author?.full_name ?? task.author?.email ?? "—"}
                </span>
                <span>·</span>
                <span>
                  {format(new Date(task.created_at), "MMM d, yyyy HH:mm")}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.description && (
            <p className="whitespace-pre-wrap text-sm">{task.description}</p>
          )}
          <div className="text-sm text-muted-foreground">
            Assigned to{" "}
            <span className="text-foreground font-medium">
              {task.assignee?.full_name ?? task.assignee?.email ?? "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Actions</h2>
        <TaskActions
          taskId={task.id}
          status={task.status}
          assigneeId={task.assignee_id}
          onChanged={load}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">History</h2>
        <TaskHistoryList entries={history} />
      </div>
    </div>
  );
}
