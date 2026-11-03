alter table public.users              enable row level security;
alter table public.construction_sites enable row level security;
alter table public.tasks              enable row level security;
alter table public.task_history       enable row level security;

create policy users_select_all
  on public.users
  for select
  to authenticated
  using (true);

create policy sites_select_manager
  on public.construction_sites
  for select
  to authenticated
  using (public.auth_role() = 'manager');

create policy sites_select_executor
  on public.construction_sites
  for select
  to authenticated
  using (
    public.auth_role() = 'executor'
    and exists (
      select 1
      from public.tasks
      where tasks.construction_site_id = construction_sites.id
        and tasks.assignee_id = auth.uid()
    )
  );

create policy sites_insert_manager
  on public.construction_sites
  for insert
  to authenticated
  with check (
    public.auth_role() = 'manager'
    and created_by = auth.uid()
  );

create policy sites_update_manager
  on public.construction_sites
  for update
  to authenticated
  using (public.auth_role() = 'manager')
  with check (public.auth_role() = 'manager');

create policy sites_delete_manager
  on public.construction_sites
  for delete
  to authenticated
  using (public.auth_role() = 'manager');

create policy tasks_select_manager
  on public.tasks
  for select
  to authenticated
  using (public.auth_role() = 'manager');

create policy tasks_select_executor
  on public.tasks
  for select
  to authenticated
  using (
    public.auth_role() = 'executor'
    and assignee_id = auth.uid()
  );

create policy tasks_insert_manager
  on public.tasks
  for insert
  to authenticated
  with check (
    public.auth_role() = 'manager'
    and created_by = auth.uid()
    and status = 'new'
  );

create policy tasks_update_manager
  on public.tasks
  for update
  to authenticated
  using (public.auth_role() = 'manager')
  with check (public.auth_role() = 'manager');

create policy tasks_delete_manager
  on public.tasks
  for delete
  to authenticated
  using (public.auth_role() = 'manager');

create policy history_select_manager
  on public.task_history
  for select
  to authenticated
  using (public.auth_role() = 'manager');

create policy history_select_executor
  on public.task_history
  for select
  to authenticated
  using (
    public.auth_role() = 'executor'
    and exists (
      select 1
      from public.tasks t
      where t.id = task_history.task_id
        and t.assignee_id = auth.uid()
    )
  );
