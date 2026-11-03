# Mini-CRM Plan — Objects & Tasks

## 1. Entity-Relationship Map

```
┌─────────────────────────┐          ┌──────────────────────────────┐
│      auth.users         │          │         public.users         │
│  (managed by Supabase)  │ 1 ─── 1  │                              │
│                         │◄─────────│  id            uuid  PK/FK   │
│  id          uuid  PK   │          │  email         text          │
│  email       text       │          │  full_name     text          │
│  encrypted_password     │          │  role          user_role     │
└─────────────────────────┘          │  created_at    timestamptz   │
                                     └──────────────┬───────────────┘
                                                    │
                                     ┌──────────────┴───────────────┐
                                     │                              │
                       created_by    │                              │ assignee_id
                                     ▼                              ▼
                      ┌─────────────────────────┐    ┌──────────────────────────────┐
                      │   construction_sites    │    │            tasks             │
                      │                         │    │                              │
                      │  id         uuid  PK    │ 1  │  id              uuid  PK    │
                      │  name       text        │────│  construction_site_id  FK    │
                      │  address    text        │ ∞  │    (ON DELETE RESTRICT)      │
                      │  created_by uuid  FK    │    │  title           text        │
                      │  created_at timestamptz │    │  description     text        │
                      └─────────────────────────┘    │  assignee_id   uuid FK NOT NULL
                                                     │  created_by      uuid  FK    │
                                                     │     (immutable)              │
                                                     │  status          task_status │
                                                     │     (write via RPC only)     │
                                                     │  created_at timestamptz      │
                                                     │     (immutable)              │
                                                     │  updated_at      timestamptz │
                                                     └──────────────┬───────────────┘
                                                                    │ 1
                                                                    │
                                                                    │ ∞
                                                     ┌──────────────▼───────────────┐
                                                     │        task_history          │
                                                     │        (append-only)         │
                                                     │                              │
                                                     │  id            uuid  PK      │
                                                     │  task_id       uuid  FK      │
                                                     │  from_status   task_status?  │
                                                     │  to_status     task_status   │
                                                     │  changed_by    uuid  FK      │
                                                     │  comment       text          │
                                                     │  changed_at    timestamptz   │
                                                     └──────────────────────────────┘
```

**Enums**
- `user_role`   = `manager` | `executor`
- `task_status` = `new` | `in_progress` | `under_review` | `accepted` | `rework`

---

## 2. Status State Machine (DB-enforced)

```
             (manager creates)
                   │
                   ▼
              ┌─────────┐
              │   new   │
              └────┬────┘
                   │ executor (assigned)
                   ▼
              ┌─────────────┐
              │ in_progress │◄───────────┐
              └────┬────────┘            │
                   │ executor (assigned) │ executor (assigned)
                   ▼                     │
              ┌───────────────┐          │
              │ under_review  │          │
              └────┬──┬───────┘          │
      manager │    │  │  manager (comment required)
       accept │    │  │                  │
              ▼    │  │                  │
         ┌──────────┐ ▼                  │
         │ accepted │ ┌────────┐         │
         │ (final)  │ │ rework │─────────┘
         └──────────┘ └────────┘
```

Any transition not shown → `transition_task` RPC raises an exception.

---

## 3. API Surface

### 3a. Supabase auto-REST (gated by RLS)

| Resource              | GET | POST | PATCH | DELETE | Notes                                                      |
|-----------------------|:---:|:----:|:-----:|:------:|------------------------------------------------------------|
| `users`               | ✅  |  ❌  |   ❌  |   ❌   | Read-only from client. Rows seeded via Supabase admin.    |
| `construction_sites`  | ✅  |  ✅  |   ✅  |   ✅   | Manager full CRUD; Executor read-only via subquery.        |
| `tasks`               | ✅  |  ✅  |   ✅  |   ✅   | Manager CRUD on meta fields only. **status column locked** by trigger — must use RPC. |
| `task_history`        | ✅  |  ❌  |   ❌  |   ❌   | Read-only from client. Inserts only from RPC.              |

### 3b. RPC (Postgres function)

```
POST /rpc/transition_task
  { task_id: uuid, to_status: task_status, comment: text | null }

  Server validates:
    - caller's role from users.role
    - caller is assignee (if executor) or is manager
    - (OLD.status, NEW.status) is a legal edge
    - comment required when under_review → rework
  Then atomically:
    - UPDATE tasks SET status = NEW.status, updated_at = now()
    - INSERT INTO task_history (...)
  Function is SECURITY DEFINER so it can write history
  while direct history inserts are blocked.
```

---

## 4. RLS Policy Matrix

Legend: ✅ allowed · ❌ denied · 🧩 conditional (see footnote)

| Table                | Op     | Manager        | Executor        |
|----------------------|--------|----------------|-----------------|
| `users`              | SELECT | ✅ all         | ✅ all          |
| `users`              | WRITE  | ❌             | ❌              |
| `construction_sites` | SELECT | ✅ all         | 🧩 (A)          |
| `construction_sites` | INSERT | ✅             | ❌              |
| `construction_sites` | UPDATE | ✅ all         | ❌              |
| `construction_sites` | DELETE | ✅ all         | ❌              |
| `tasks`              | SELECT | ✅ all         | 🧩 (B)          |
| `tasks`              | INSERT | 🧩 (C)         | ❌              |
| `tasks`              | UPDATE | 🧩 (D)         | ❌              |
| `tasks`              | DELETE | ✅ all         | ❌              |
| `task_history`       | SELECT | ✅ all         | 🧩 (E)          |
| `task_history`       | WRITE  | ❌ (RPC only)  | ❌ (RPC only)   |

- **(A)** Executor sees site iff `EXISTS (SELECT 1 FROM tasks WHERE construction_site_id = sites.id AND assignee_id = auth.uid())`
- **(B)** Executor sees task iff `assignee_id = auth.uid()`
- **(C)** Manager insert: `WITH CHECK (status = 'new' AND created_by = auth.uid())`
- **(D)** Manager update: RLS allows the row; a BEFORE UPDATE trigger on `tasks` rejects any change to `status`, `created_by`, or `created_at` unless the update is coming from inside `transition_task` (status only). Keeps "author" and "created date" tamper-proof even from a logged-in manager hitting `/rest/v1/tasks` directly.
- **(E)** Executor reads history iff they can read the parent task (same (B) rule, via EXISTS)

---

## 5. UI Screens → Data Access

| Screen                     | Reads                                   | Writes                                      | Role       |
|----------------------------|-----------------------------------------|---------------------------------------------|------------|
| Login                      | `auth.signInWithPassword`               | —                                           | both       |
| Objects list               | `construction_sites`                    | —                                           | both       |
| New/edit object            | `construction_sites`                    | insert/update `construction_sites`          | manager    |
| Object card                | `construction_sites` + `tasks` by site  | —                                           | both       |
| New task                   | `users` (executors), `sites`            | insert `tasks` (status=`new`)               | manager    |
| Edit task meta             | —                                       | update `tasks` (no status)                  | manager    |
| Delete task                | —                                       | delete `tasks`                              | manager    |
| Task card                  | `tasks` + `task_history`                | `rpc('transition_task', …)`                 | both       |
| "My tasks"                 | `tasks` where `assignee_id = me`        | —                                           | executor   |

UI hides buttons the caller can't use, but **every rule above is also enforced in the DB** — bypassing the UI changes nothing.

---

## 6. Security Checklist (maps to task's section 3)

| Requirement                                        | Mechanism                                         |
|----------------------------------------------------|---------------------------------------------------|
| 1. Access rules at DB level, not just UI          | RLS on every table + immutability trigger on `tasks` (`status`, `created_by`, `created_at`) |
| 2. Executor can't read/modify others' tasks       | RLS `assignee_id = auth.uid()`                    |
| 3. Illegal status transitions rejected by DB      | `transition_task` validates edges + status trigger blocks direct writes |
| 4. History cannot be forged/edited/deleted        | RLS: no client INSERT/UPDATE/DELETE on `task_history`; only `transition_task` (SECURITY DEFINER) writes |
| 5. Open registration disabled                      | Supabase Auth: email signups off; users seeded manually |
| 6. Service keys not in frontend/repo              | Only `anon` key in frontend; `.env.local` gitignored; service key used only for seed script run locally |

---

## 7. Build Order

1. **Supabase project** — create, disable public signups, generate anon key.
2. **Migrations** (sql files, committed to repo):
   - enums (`user_role`, `task_status`)
   - tables (`users`, `construction_sites`, `tasks`, `task_history`) with FKs: `tasks.construction_site_id` → `ON DELETE RESTRICT`; `tasks.assignee_id` `NOT NULL`
   - trigger `on_auth_user_created` on `auth.users` → inserts matching `public.users` row (so we can create test users from the Supabase dashboard and the app side stays in sync)
   - trigger on `tasks` BEFORE UPDATE: rejects changes to `status`, `created_by`, `created_at` (status may change only when `transition_task` sets a session flag)
   - function `transition_task` (SECURITY DEFINER): validates role + edge + comment-requirement, flips status, inserts history row
   - RLS policies per the matrix above
   - seed: 1 manager + 2 executors (dashboard or `auth.admin_create_user`), set `role` on `public.users`, 2–3 sites, several tasks across statuses
3. **Frontend** — Vite + React + TS, UI lib (shadcn/ui or Mantine), supabase-js client.
4. **Screens** in the order of section 5.
5. **Deploy** to Vercel, write README + non-tech explanation + decisions/assumptions list.
