import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/transitions";
import type { TaskStatus } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const STYLES: Record<TaskStatus, string> = {
  new: "bg-slate-100 text-slate-800 hover:bg-slate-100",
  in_progress: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  under_review: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  accepted: "bg-green-100 text-green-800 hover:bg-green-100",
  rework: "bg-red-100 text-red-800 hover:bg-red-100",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="secondary" className={cn("font-normal", STYLES[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
