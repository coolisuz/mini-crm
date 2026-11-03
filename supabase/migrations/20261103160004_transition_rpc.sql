create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.transition_task(
  p_task_id uuid,
  p_to_status public.task_status,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_task public.tasks%rowtype;
  v_caller uuid := auth.uid();
  v_caller_role public.user_role;
  v_from public.task_status;
  v_clean_comment text := nullif(btrim(p_comment), '');
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_caller_role from public.users where id = v_caller;
  if v_caller_role is null then
    raise exception 'Caller is not a registered user';
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;
  v_from := v_task.status;

  if v_from = 'new' and p_to_status = 'in_progress' then
    if v_caller_role <> 'executor' or v_task.assignee_id <> v_caller then
      raise exception 'Only the assigned executor can start this task';
    end if;
  elsif v_from = 'in_progress' and p_to_status = 'under_review' then
    if v_caller_role <> 'executor' or v_task.assignee_id <> v_caller then
      raise exception 'Only the assigned executor can submit for review';
    end if;
  elsif v_from = 'under_review' and p_to_status = 'accepted' then
    if v_caller_role <> 'manager' then
      raise exception 'Only a manager can accept this task';
    end if;
  elsif v_from = 'under_review' and p_to_status = 'rework' then
    if v_caller_role <> 'manager' then
      raise exception 'Only a manager can return this task for rework';
    end if;
    if v_clean_comment is null then
      raise exception 'A comment is required when returning a task for rework';
    end if;
  elsif v_from = 'rework' and p_to_status = 'in_progress' then
    if v_caller_role <> 'executor' or v_task.assignee_id <> v_caller then
      raise exception 'Only the assigned executor can resume this task';
    end if;
  else
    raise exception 'Illegal transition: % -> %', v_from, p_to_status;
  end if;

  perform set_config('app.allow_status_change', 'true', true);
  update public.tasks set status = p_to_status where id = p_task_id;

  insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
  values (p_task_id, v_from, p_to_status, v_caller, v_clean_comment);
end;
$$;

revoke all on function public.transition_task(uuid, public.task_status, text) from public;
grant execute on function public.transition_task(uuid, public.task_status, text) to authenticated;

revoke all on function public.auth_role() from public;
grant execute on function public.auth_role() to authenticated;
