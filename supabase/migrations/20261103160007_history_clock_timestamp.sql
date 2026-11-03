alter table public.task_history
  alter column changed_at set default clock_timestamp();

with ordered as (
  select
    id,
    task_id,
    changed_at,
    case
      when from_status is null                              then 0
      when from_status = 'new'::public.task_status          then 1
      when from_status = 'in_progress'::public.task_status  then 2
      when from_status = 'under_review'::public.task_status then 3
      when from_status = 'rework'::public.task_status       then 4
      when from_status = 'accepted'::public.task_status     then 5
    end as rank,
    count(*) over (partition by task_id, changed_at) as cluster_size
  from public.task_history
)
update public.task_history h
set changed_at = o.changed_at + (o.rank * interval '1 microsecond')
from ordered o
where h.id = o.id
  and o.cluster_size > 1;
