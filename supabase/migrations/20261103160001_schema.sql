create extension if not exists pgcrypto;

create type public.user_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'under_review', 'accepted', 'rework');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'executor',
  created_at timestamptz not null default now()
);

create table public.construction_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  construction_site_id uuid not null references public.construction_sites(id) on delete restrict,
  title text not null,
  description text not null default '',
  assignee_id uuid not null references public.users(id),
  created_by uuid not null references public.users(id),
  status public.task_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_site_idx on public.tasks(construction_site_id);

create table public.task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  from_status public.task_status,
  to_status public.task_status not null,
  changed_by uuid not null references public.users(id),
  comment text,
  changed_at timestamptz not null default now()
);

create index task_history_task_idx on public.task_history(task_id, changed_at desc);
