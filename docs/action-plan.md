# Mini-CRM — Action Plan

## Folder Structure

```
mini-crm/
├── supabase/
│   └── migrations/
│       ├── 20260101_0001_init_schema.sql       # enums + tables + FKs + indexes
│       ├── 20260101_0002_auth_sync.sql         # auth.users → public.users trigger
│       ├── 20260101_0003_immutability.sql      # tasks: block status/created_by/created_at direct writes
│       ├── 20260101_0004_transition_rpc.sql    # transition_task(uuid, task_status, text)
│       ├── 20260101_0005_rls_policies.sql      # all RLS per matrix
│       └── 20260101_0006_seed.sql              # 1 manager, 2 executors, 2–3 sites, tasks
│
├── src/
│   ├── lib/
│   │   ├── supabase.ts            # createClient(anon key), one singleton
│   │   ├── database.types.ts      # generated: `supabase gen types typescript`
│   │   └── transitions.ts         # client-side mirror of legal edges (UI gating only)
│   │
│   ├── hooks/
│   │   ├── useSession.ts          # auth state + role lookup
│   │   ├── useSites.ts            # list / create / update / delete sites
│   │   └── useTasks.ts            # list / create / update / delete / transition
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn primitives (button, dialog, input, select, badge, table, …)
│   │   ├── AppShell.tsx           # top bar + nav; shows logged-in user + role + sign out
│   │   ├── RoleGuard.tsx          # <RoleGuard role="manager">…</RoleGuard>
│   │   ├── RequireAuth.tsx        # redirects to /login if no session
│   │   ├── StatusBadge.tsx        # colored pill per task_status
│   │   ├── TaskActions.tsx        # renders only the buttons available for (role, status, assignee)
│   │   ├── TaskHistoryList.tsx    # reverse-chronological, with who/when/comment
│   │   ├── TaskForm.tsx           # create/edit (manager)
│   │   └── SiteForm.tsx           # create/edit (manager)
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SitesPage.tsx          # list of construction_sites
│   │   ├── SiteDetailPage.tsx     # one site + its tasks
│   │   ├── TaskDetailPage.tsx     # one task: fields, actions, history
│   │   └── MyTasksPage.tsx        # executor-only: tasks where assignee_id = me
│   │
│   ├── App.tsx                    # routes + guards
│   ├── main.tsx                   # React root, Tailwind import
│   └── index.css                  # Tailwind directives
│
├── docs/
│   ├── EXPLANATION.md             # ½-page non-tech writeup (deliverable #3)
│   └── ASSUMPTIONS.md             # decisions & what's not done (deliverable #4)
│
├── .env.example                   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .env.local                     # (gitignored)
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
├── components.json                # shadcn config
└── README.md                      # how to run (deliverable #2)
```

**Why this shape**
- Supabase CLI's `supabase/migrations/` convention — `supabase db reset` just works, migrations commit to repo as required.
- Vite project at the root (not under `web/`) — simpler scripts, Vercel auto-detects.
- `src/pages/` holds routed views; `src/components/` holds reusables. One flat level each — no deep nesting for a 10-screen app.
- `database.types.ts` is generated from the live schema (`supabase gen types typescript --project-id <id>`) — gives us typed queries without hand-maintaining types.
- `lib/transitions.ts` is a client-side copy of the state machine used **only** for hiding buttons. The real check is in the DB; this file duplicates the rules for UX, not for security.

---

## Step-by-step Build Order (with time budget)

Target: ~3h focused. Order is dependency-driven — don't skip ahead.

### Phase 1 — Foundation (~25 min)

1. **Init repo** — `git init`, `.gitignore` (node_modules, `.env.local`, `dist`, `.DS_Store`).
2. **Scaffold Vite** — `npm create vite@latest . -- --template react-ts`.
3. **Install deps** — `@supabase/supabase-js`, `react-router-dom`, `zod`, `react-hook-form`, `@hookform/resolvers`.
4. **Tailwind + shadcn** — `npx tailwindcss init -p`, configure `content`, add directives to `index.css`. Then `npx shadcn@latest init` → `npx shadcn@latest add button input label dialog select textarea badge table card dropdown-menu sonner`.
5. **Supabase project** — create in dashboard, **turn off public signups** (Auth → Providers → Email → disable "Enable sign-ups"). Copy URL + anon key into `.env.local` and `.env.example` (keys only in `.env.local`).
6. **`supabase/` init** — `supabase init` locally so migration files have the right shape.

### Phase 2 — Database (~45 min)

7. **Migration 0001 — schema** — enums (`user_role`, `task_status`), `public.users`, `construction_sites`, `tasks` (with `assignee_id NOT NULL`, `construction_site_id ON DELETE RESTRICT`), `task_history`. Indexes: `tasks(assignee_id)`, `tasks(construction_site_id)`, `task_history(task_id, changed_at desc)`.
8. **Migration 0002 — auth sync** — `handle_new_user()` SECURITY DEFINER function + `AFTER INSERT ON auth.users` trigger. Default `role = 'executor'`; promote manually after creation.
9. **Migration 0003 — immutability** — BEFORE UPDATE trigger on `tasks`: raise if `OLD.status IS DISTINCT FROM NEW.status` AND `current_setting('app.allow_status_change', true) IS NOT 'true'`; always raise if `created_by` or `created_at` changes.
10. **Migration 0004 — RPC** — `transition_task(p_task_id uuid, p_to_status task_status, p_comment text)`: SECURITY DEFINER, locks the task row, validates (role from `public.users`, assignee match for executor edges, legal edge, comment-required for `under_review → rework`), sets `app.allow_status_change = true`, updates `tasks.status`, inserts `task_history`, resets the flag.
11. **Migration 0005 — RLS** — enable RLS on all four tables, policies per the matrix in the plan doc.
12. **Migration 0006 — seed** — create 3 users via `auth.admin_create_user` (or dashboard then run SQL to set roles), 2–3 sites, ~5 tasks across statuses. Status progression done via `transition_task` calls so history rows exist.
13. **Verify** — `supabase db reset` runs everything clean. In SQL editor as an executor JWT, try: direct `UPDATE tasks SET status = 'accepted'` (must fail), `INSERT INTO task_history` (must fail), `SELECT * FROM tasks` (returns only own).

### Phase 3 — Auth & shell (~30 min)

14. **`lib/supabase.ts`** — single `createClient` reading `import.meta.env.VITE_*`.
15. **Generate types** — `supabase gen types typescript --project-id … > src/lib/database.types.ts`.
16. **`useSession`** — listens to `onAuthStateChange`, loads `public.users` row (role + full_name).
17. **`LoginPage`** — email + password, `signInWithPassword`, errors as toast.
18. **`RequireAuth` + `RoleGuard`** — route-level guards.
19. **`AppShell`** — top bar: app name, user email + role badge, sign-out.

### Phase 4 — Screens (~75 min)

20. **`SitesPage`** — list, with "New site" button (manager). Click → `/sites/:id`.
21. **`SiteForm`** (dialog) — create/edit site. Manager only.
22. **`SiteDetailPage`** — site info + tasks table. "New task" button (manager). Delete site button (manager; show FK-restrict error as toast if tasks exist).
23. **`TaskForm`** (dialog) — create/edit task. Fields: title, description, assignee (dropdown of executors from `public.users`). Create forces `status='new'`.
24. **`TaskDetailPage`** — task fields, `StatusBadge`, `TaskActions`, `TaskHistoryList`.
25. **`TaskActions`** — renders only buttons legal for `(role, status, assignee===me)`. Clicking opens a confirm dialog; `rework` button requires a comment textarea. All call `rpc('transition_task', …)`.
26. **`TaskHistoryList`** — one row per history entry: from → to, who, when (relative), comment if present.
27. **`MyTasksPage`** — executor's assigned tasks, grouped by status.

### Phase 5 — Ship (~25 min)

28. **Deploy** — push to GitHub, import in Vercel, set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, deploy.
29. **README** — one-paragraph overview; "Run locally" (clone, `.env.local`, `npm i`, `npm run dev`); "Apply migrations" (`supabase link`, `supabase db push`); credentials for the three seeded accounts.
30. **`docs/EXPLANATION.md`** — ½-page in plain language: how the app works, how data is locked at the DB, what an executor cannot do (even with raw access).
31. **`docs/ASSUMPTIONS.md`** — the three assumptions already identified (manager can edit meta in any status; reassignments not in history; `accepted` is terminal) + anything that came up during the build + anything cut.

---

## Smoke Test Script (run before handing off)

As each role, in the deployed app:

**Manager**
- Create a site, create a task, assign to Executor A.
- Edit the task (title). Try to delete a site with tasks → should fail with a clear message.
- When Executor A sends it for review → accept one, send another back with required comment.

**Executor A**
- Sees only sites they have tasks on.
- Moves `new → in_progress → under_review`.
- Cannot see Executor B's tasks on a shared site.

**Executor B**
- Cannot see Executor A's tasks at all.

**Raw-API probe (proves DB security)**
- Open DevTools, grab the executor's JWT, hit `PATCH /rest/v1/tasks?id=eq.<other-user-task>` → 0 rows / 403.
- Hit `PATCH /rest/v1/tasks?id=eq.<own>` with `{"status":"accepted"}` → rejected by trigger.
- Hit `POST /rest/v1/task_history` with any body → rejected by RLS.
- Record one of these as a screenshot/log and paste into `EXPLANATION.md`.
