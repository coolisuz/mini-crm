import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase, type Tables } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Executor = Pick<Tables["users"]["Row"], "id" | "full_name" | "email">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  initial?: {
    id: string;
    title: string;
    description: string;
    assignee_id: string;
  } | null;
  onSaved: () => void;
};

export function TaskForm({
  open,
  onOpenChange,
  siteId,
  initial,
  onSaved,
}: Props) {
  const { user } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [executors, setExecutors] = useState<Executor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setAssigneeId(initial?.assignee_id ?? "");
    void (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "executor")
        .order("full_name");
      if (error) {
        toast.error(error.message);
        return;
      }
      setExecutors(data ?? []);
    })();
  }, [open, initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!assigneeId) {
      toast.error("Please choose an assignee");
      return;
    }
    setSaving(true);
    const base = {
      title: title.trim(),
      description: description.trim(),
      assignee_id: assigneeId,
    };
    const { error } = initial
      ? await supabase.from("tasks").update(base).eq("id", initial.id)
      : await supabase.from("tasks").insert({
          ...base,
          construction_site_id: siteId,
          created_by: user.id,
        });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial ? "Task updated" : "Task created");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initial ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>
              {initial
                ? "Change title, description, or assignee."
                : "A new task starts in the ‘New’ status."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="task-assignee">
                  <SelectValue placeholder="Choose executor" />
                </SelectTrigger>
                <SelectContent>
                  {executors.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {ex.full_name ?? ex.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
