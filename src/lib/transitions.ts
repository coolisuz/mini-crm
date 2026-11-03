import type { TaskStatus, UserRole } from "./supabase";

export type TransitionEdge = {
  from: TaskStatus;
  to: TaskStatus;
  role: UserRole;
  requiresAssignee: boolean;
  requiresComment: boolean;
  label: string;
};

export const EDGES: TransitionEdge[] = [
  {
    from: "new",
    to: "in_progress",
    role: "executor",
    requiresAssignee: true,
    requiresComment: false,
    label: "Start",
  },
  {
    from: "in_progress",
    to: "under_review",
    role: "executor",
    requiresAssignee: true,
    requiresComment: false,
    label: "Submit for review",
  },
  {
    from: "under_review",
    to: "accepted",
    role: "manager",
    requiresAssignee: false,
    requiresComment: false,
    label: "Accept",
  },
  {
    from: "under_review",
    to: "rework",
    role: "manager",
    requiresAssignee: false,
    requiresComment: true,
    label: "Send back for rework",
  },
  {
    from: "rework",
    to: "in_progress",
    role: "executor",
    requiresAssignee: true,
    requiresComment: false,
    label: "Resume work",
  },
];

export function availableEdges(
  status: TaskStatus,
  role: UserRole,
  isAssignee: boolean,
): TransitionEdge[] {
  return EDGES.filter(
    (e) =>
      e.from === status &&
      e.role === role &&
      (!e.requiresAssignee || isAssignee),
  );
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: "New",
  in_progress: "In progress",
  under_review: "Under review",
  accepted: "Accepted",
  rework: "Rework",
};
