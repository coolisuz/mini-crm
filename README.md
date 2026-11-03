# Mini-CRM — Objects & Tasks

A small CRM for a construction company. Managers assign tasks on construction
sites; executors do them and submit for review.

- **Live app:** https://mini-crm-objects-tasks.netlify.app
- **Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui, Supabase (Postgres + Auth)

## Seeded accounts

| Email | Password | Role |
|---|---|---|
| `manager@mini-crm.test` | `Manager123!` | manager |
| `executor1@mini-crm.test` | `Executor123!` | executor (Bob) |
| `executor2@mini-crm.test` | `Executor123!` | executor (Carol) |

Seed also creates 2 sites and 4 tasks across different statuses.

## Run locally

```bash
cp .env.example .env.local       # fill in Supabase values
npm install
npm run dev                       # http://localhost:5173
```

`.env.local`:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Both come from Supabase Dashboard → Project Settings → API Keys.

## Apply migrations to your own Supabase project

1. Create a project on [supabase.com](https://supabase.com).
2. Authentication → Providers → Email → **turn off "Allow new users to sign up"**.
3. From the project root:

   ```bash
   export SUPABASE_ACCESS_TOKEN=sbp_...        # supabase.com/dashboard/account/tokens
   npx supabase link --project-ref <your-ref>
   npx supabase db push --remote --yes
   ```

## Deploy

Any static host. Build command `npm run build`, output `dist/`. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as env vars on the host.

## Repo layout

```
supabase/migrations/       7 SQL files, applied in order
src/lib/                   supabase client, generated types, state-machine mirror
src/hooks/useSession.ts    auth session + role lookup
src/components/            AppShell, guards, forms, status badge, task actions, history
src/pages/                 Login, Sites, SiteDetail, TaskDetail, MyTasks
src/App.tsx                routes + guards
docs/plan.md               architecture + RLS matrix
docs/action-plan.md        step-by-step build order
docs/EXPLANATION.md        non-technical writeup
docs/ASSUMPTIONS.md        decisions where the spec was open
```

## Security

All rules are enforced in Postgres, not just the UI.

- RLS on every table filters rows per the caller's role.
- Executors can only read/affect tasks where `assignee_id = auth.uid()`; they see
  sites only when they have a task on them.
- The `status` column on `tasks` cannot change via a direct `PATCH` — a trigger
  rejects it unless the update comes from the `transition_task` function.
- `transition_task` validates the caller's role, the state-machine edge, and
  the comment-required rule, then updates `status` and writes a `task_history`
  row atomically.
- No client has INSERT/UPDATE/DELETE policies on `task_history`.
- `tasks.created_by` and `tasks.created_at` are immutable (same trigger).
- Only the publishable anon key ships to the frontend; the service-role key
  stays in Supabase.

Plain-language version: [docs/EXPLANATION.md](docs/EXPLANATION.md).
