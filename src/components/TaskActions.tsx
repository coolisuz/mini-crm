import { useState } from "react";
import { toast } from "sonner";
import { supabase, type TaskStatus } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { availableEdges, type TransitionEdge } from "@/lib/transitions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  taskId: string;
  status: TaskStatus;
  assigneeId: string;
  onChanged: () => void;
};

export function TaskActions({ taskId, status, assigneeId, onChanged }: Props) {
  const { user } = useSession();
  const [pending, setPending] = useState<TransitionEdge | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;
  const edges = availableEdges(status, user.role, assigneeId === user.id);

  if (edges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No actions available in the current status.
      </p>
    );
  }

  function openConfirm(edge: TransitionEdge) {
    setComment("");
    setPending(edge);
  }

  async function submitTransition() {
    if (!pending) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("transition_task", {
      p_task_id: taskId,
      p_to_status: pending.to,
      p_comment: comment.trim() || undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Moved to ${pending.to.replace("_", " ")}`);
    setPending(null);
    onChanged();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {edges.map((edge) => (
        <Button
          key={edge.to}
          variant={edge.to === "rework" ? "destructive" : "default"}
          onClick={() => openConfirm(edge)}
        >
          {edge.label}
        </Button>
      ))}

      <Dialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.label}?</DialogTitle>
            <DialogDescription>
              The transition is recorded in the task history.
            </DialogDescription>
          </DialogHeader>
          {pending?.requiresComment && (
            <div className="space-y-2 py-2">
              <Label htmlFor="transition-comment">
                Comment (required)
              </Label>
              <Textarea
                id="transition-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What needs to change?"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitTransition}
              disabled={
                submitting ||
                (pending?.requiresComment === true && comment.trim() === "")
              }
            >
              {submitting ? "Working…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
