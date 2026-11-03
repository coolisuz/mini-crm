import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";
import type { TaskStatus } from "@/lib/supabase";
import { STATUS_LABEL } from "@/lib/transitions";

type HistoryEntry = {
  id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  changed_at: string;
  comment: string | null;
  changed_by_user: {
    full_name: string | null;
    email: string;
  } | null;
};

export function TaskHistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No history yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li
          key={e.id}
          className="rounded-md border p-3 text-sm space-y-1"
        >
          <div className="flex items-center gap-2 text-foreground">
            {e.from_status ? (
              <>
                <span className="text-muted-foreground">
                  {STATUS_LABEL[e.from_status]}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">
                  {STATUS_LABEL[e.to_status]}
                </span>
              </>
            ) : (
              <span className="font-medium">Created ({STATUS_LABEL[e.to_status]})</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {e.changed_by_user?.full_name ?? e.changed_by_user?.email ?? "unknown"}
            {" · "}
            {formatDistanceToNow(new Date(e.changed_at), { addSuffix: true })}
          </div>
          {e.comment && (
            <div className="text-sm text-foreground pt-1 border-t mt-2">
              {e.comment}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
