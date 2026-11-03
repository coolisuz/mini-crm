import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase, type Tables, type TaskStatus } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { RoleGuard } from "@/components/RoleGuard";
import { StatusBadge } from "@/components/StatusBadge";
import { SiteForm } from "@/components/SiteForm";
import { TaskForm } from "@/components/TaskForm";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Site = Pick<
  Tables["construction_sites"]["Row"],
  "id" | "name" | "address"
>;

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee_id: string;
  description: string;
  assignee: { full_name: string | null; email: string } | null;
};

export function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [site, setSite] = useState<Site | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFormOpen, setSiteFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const [siteRes, tasksRes] = await Promise.all([
      supabase
        .from("construction_sites")
        .select("id, name, address")
        .eq("id", siteId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select(
          "id, title, status, assignee_id, description, assignee:users!tasks_assignee_id_fkey(full_name, email)",
        )
        .eq("construction_site_id", siteId)
        .order("created_at", { ascending: false }),
    ]);
    setLoading(false);
    if (siteRes.error) {
      toast.error(siteRes.error.message);
      return;
    }
    if (tasksRes.error) {
      toast.error(tasksRes.error.message);
      return;
    }
    setSite(siteRes.data);
    setTasks((tasksRes.data as TaskRow[]) ?? []);
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteSite() {
    if (!site) return;
    if (!confirm(`Delete site “${site.name}”?`)) return;
    const { error } = await supabase
      .from("construction_sites")
      .delete()
      .eq("id", site.id);
    if (error) {
      toast.error(
        error.code === "23503"
          ? "This site still has tasks. Delete them first."
          : error.message,
      );
      return;
    }
    toast.success("Site deleted");
    navigate("/");
  }

  async function deleteTask(task: TaskRow) {
    if (!confirm(`Delete task “${task.title}”?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task deleted");
    void load();
  }

  function openNewTask() {
    setEditingTask(null);
    setTaskFormOpen(true);
  }

  function openEditTask(t: TaskRow) {
    setEditingTask(t);
    setTaskFormOpen(true);
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!site) return <p className="text-muted-foreground">Site not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          All objects
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">{site.name}</h1>
              <p className="text-sm text-muted-foreground">{site.address}</p>
            </div>
            <RoleGuard role="manager">
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSiteFormOpen(true)}
                  aria-label="Edit site"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={deleteSite}
                  aria-label="Delete site"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </RoleGuard>
          </div>
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <RoleGuard role="manager">
          <Button onClick={openNewTask}>
            <Plus className="h-4 w-4 mr-1" />
            New task
          </Button>
        </RoleGuard>
      </div>

      {tasks.length === 0 ? (
        <p className="text-muted-foreground">
          {user?.role === "manager"
            ? "No tasks on this site yet."
            : "You have no tasks on this site."}
        </p>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link
                      to={`/tasks/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.assignee?.full_name ?? t.assignee?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <RoleGuard role="manager">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditTask(t)}
                          aria-label="Edit task"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteTask(t)}
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </RoleGuard>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SiteForm
        open={siteFormOpen}
        onOpenChange={setSiteFormOpen}
        initial={site}
        onSaved={load}
      />
      <TaskForm
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        siteId={site.id}
        initial={editingTask}
        onSaved={load}
      />
    </div>
  );
}
