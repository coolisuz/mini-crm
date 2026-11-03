create or replace function public.tasks_write_creation_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.task_history (task_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, new.created_by);
  return new;
end;
$$;

create trigger tasks_after_insert_history
after insert on public.tasks
for each row
execute function public.tasks_write_creation_history();

create or replace function public.tasks_prevent_illegal_updates()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'tasks.created_by is immutable';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'tasks.created_at is immutable';
  end if;
  if new.status is distinct from old.status
     and coalesce(current_setting('app.allow_status_change', true), 'false') <> 'true' then
    raise exception 'tasks.status cannot be changed via direct update; use the transition_task RPC';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_before_update_guard
before update on public.tasks
for each row
execute function public.tasks_prevent_illegal_updates();
