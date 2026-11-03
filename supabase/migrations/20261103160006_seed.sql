do $$
declare
  v_manager_id constant uuid := '11111111-1111-1111-1111-111111111111';
  v_exec1_id   constant uuid := '22222222-2222-2222-2222-222222222222';
  v_exec2_id   constant uuid := '33333333-3333-3333-3333-333333333333';
  v_site1_id   constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_site2_id   constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  v_task_a_id  constant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  v_task_b_id  constant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2';
  v_task_c_id  constant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3';
  v_task_d_id  constant uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_manager_id, 'authenticated', 'authenticated',
     'manager@mini-crm.test', crypt('Manager123!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Manager"}',
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_exec1_id, 'authenticated', 'authenticated',
     'executor1@mini-crm.test', crypt('Executor123!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Executor"}',
     now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_exec2_id, 'authenticated', 'authenticated',
     'executor2@mini-crm.test', crypt('Executor123!', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Carol Executor"}',
     now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  update public.users set role = 'manager' where id = v_manager_id;

  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), v_manager_id,
     jsonb_build_object('sub', v_manager_id::text, 'email', 'manager@mini-crm.test'),
     'email', v_manager_id::text, now(), now(), now()),
    (gen_random_uuid(), v_exec1_id,
     jsonb_build_object('sub', v_exec1_id::text, 'email', 'executor1@mini-crm.test'),
     'email', v_exec1_id::text, now(), now(), now()),
    (gen_random_uuid(), v_exec2_id,
     jsonb_build_object('sub', v_exec2_id::text, 'email', 'executor2@mini-crm.test'),
     'email', v_exec2_id::text, now(), now(), now())
  on conflict (provider, provider_id) do nothing;

  insert into public.construction_sites (id, name, address, created_by)
  values
    (v_site1_id, 'Downtown Tower',       '100 Main St, City Center', v_manager_id),
    (v_site2_id, 'Riverside Apartments', '42 River Rd, Westside',    v_manager_id)
  on conflict (id) do nothing;

  insert into public.tasks (id, construction_site_id, title, description, assignee_id, created_by)
  values
    (v_task_a_id, v_site1_id, 'Pour foundation section A',
     'Concrete pour for the north foundation.', v_exec1_id, v_manager_id),
    (v_task_b_id, v_site1_id, 'Install rebar grid',
     'Lay out and tie rebar grid for section A.', v_exec2_id, v_manager_id),
    (v_task_c_id, v_site2_id, 'Topographic survey',
     'Full-site topo survey, 1m resolution.', v_exec1_id, v_manager_id),
    (v_task_d_id, v_site2_id, 'Soil samples',
     'Take 5 cores for the geotech report.', v_exec2_id, v_manager_id)
  on conflict (id) do nothing;

  if (select status from public.tasks where id = v_task_a_id) = 'new' then
    perform set_config('app.allow_status_change', 'true', true);

    update public.tasks set status = 'in_progress'  where id = v_task_a_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by)
      values (v_task_a_id, 'new', 'in_progress', v_exec1_id);
    update public.tasks set status = 'under_review' where id = v_task_a_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by)
      values (v_task_a_id, 'in_progress', 'under_review', v_exec1_id);

    update public.tasks set status = 'in_progress'  where id = v_task_b_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by)
      values (v_task_b_id, 'new', 'in_progress', v_exec2_id);
    update public.tasks set status = 'under_review' where id = v_task_b_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by)
      values (v_task_b_id, 'in_progress', 'under_review', v_exec2_id);
    update public.tasks set status = 'rework' where id = v_task_b_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
      values (v_task_b_id, 'under_review', 'rework', v_manager_id,
              'Please double-check the measurements near the east corner.');

    update public.tasks set status = 'in_progress'  where id = v_task_c_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by)
      values (v_task_c_id, 'new', 'in_progress', v_exec1_id);
    update public.tasks set status = 'under_review' where id = v_task_c_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by)
      values (v_task_c_id, 'in_progress', 'under_review', v_exec1_id);
    update public.tasks set status = 'accepted' where id = v_task_c_id;
    insert into public.task_history (task_id, from_status, to_status, changed_by)
      values (v_task_c_id, 'under_review', 'accepted', v_manager_id);
  end if;
end $$;
