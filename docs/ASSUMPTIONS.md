# Decisions & assumptions

Where the task description was open or silent, these are the choices made
and the reasoning.

## Data model

- **`public.users` extends `auth.users`.** `role` and `full_name` live in
  `public.users`; `auth.users` stays untouched. A trigger
  (`on_auth_user_created`) mirrors a row into `public.users` with default
  role `executor` whenever an admin creates an account.
- **`tasks.assignee_id` is `NOT NULL`.** The spec says the manager assigns
  the executor; interpreting that as a creation-time requirement keeps the
  state machine simple — a "New" task always has someone who can move it to
  "In progress."
- **`tasks.construction_site_id` has `ON DELETE RESTRICT`.** A manager must
  delete or reassign tasks before dropping their site. The UI surfaces a
  readable error ("This site still has tasks. Delete them first.") instead
  of silent cascade.
- **`task_history.task_id` has `ON DELETE CASCADE`.** If a manager
  intentionally deletes a task, its history goes with it. The spec requires
  that history cannot be forged, edited, or deleted _via the API_; that is
  about covert tampering through the Data API, not about blocking an
  explicit admin action. Direct `DELETE` / `UPDATE` on `task_history` from a
  client is denied by RLS.
- **`task_history.changed_at` defaults to `clock_timestamp()`**, not `now()`.
  `now()` is frozen for a transaction, so batch inserts (seed, bulk import)
  all tied on the same timestamp and displayed in heap order.
  `clock_timestamp()` advances within a transaction. Runtime transitions
  (one RPC call = one tx) are unaffected either way.

## Permissions

- **All authenticated users can SELECT all rows in `public.users`.** The spec
  restricts _task_ and _site_ visibility, not the user directory. The UI
  needs the full user list to resolve author and assignee names everywhere.
  Writes to `public.users` are denied for everyone — rows arrive only via
  the auth-sync trigger.
- **A manager can edit a task's title, description, and assignee in any
  status.** The spec doesn't forbid this. Changing status still requires the
  RPC regardless of role.
- **Reassigning a task is not written to `task_history`.** The spec says the
  history records status changes; assignee changes aren't a status change.

## State machine

- **`accepted` is a terminal state.** The spec says "other transitions
  forbidden"; nothing leads out of `accepted`.
- **No creation history row for sites.** The spec only requires history for
  task status changes.
- **Creation produces a `null → new` row in `task_history`.** Not strictly
  required by the spec, but it gives the demo a visible "Created" entry at
  the start of the timeline and makes "who created this task" readable from
  one source.

## Security surface area

- **No helper service in front of PostgREST.** All data access is
  Supabase's auto-generated REST plus one RPC (`transition_task`). This
  removes an entire layer where auth could be bypassed.
- **`transition_task` is the single mutator of `status` and `task_history`.**
  Direct `UPDATE tasks SET status = …` fails via a trigger; direct `INSERT
  INTO task_history` fails via RLS. The trigger reads a session-local flag
  that only `transition_task` sets.
- **`auth_role()` is `SECURITY DEFINER`** so RLS policies on `public.users`
  can call it without infinite recursion.
- **Open signups are disabled** in the Supabase project settings.

## What I didn't build (and why)

- **No `.github/workflows`.** Not required by the spec; the live app is on
  Vercel, migrations are applied via `supabase db push`.
- **No end-to-end tests.** Instead there is a documented verification pass
  (twelve probes) run against the live DB that covers the same behaviors —
  SELECT filtering per role, direct-write rejections, illegal-transition
  rejections, comment-required rule. For a 2–3h build the test budget went
  into probing real security instead of unit tests.
- **No separate RPCs for `create_task` / `update_task` / `delete_task`.**
  Manager mutations on `tasks` go through RLS-gated `INSERT` / `UPDATE` /
  `DELETE` with the trigger enforcing immutability of status, author, and
  creation time.
- **No pagination.** The demo dataset is tiny; adding it would just slow the
  reviewer down.
- **No real-time updates (channels / subscriptions).** Not asked. One-click
  refresh on each page is enough for a demo. Easy to add later.
- **No audit of reassignments.** See above — spec only requires status
  history.

## Known cosmetic rough edges

- The three seed `task_history` rows for the "Topographic survey" task
  originally shared identical timestamps because they were written in a
  single transaction before the clock-timestamp migration (0007) landed;
  migration 0007 re-spreads them by microseconds based on the state-machine
  order so they display in the correct sequence.
- One task ("Pour foundation section A") sits in `Rework` state because the
  final security probe run against the live DB used it to demonstrate the
  comment-required rule. Left in place because it exercises every state
  (new, in_progress, under_review, rework, accepted) across the four tasks.
