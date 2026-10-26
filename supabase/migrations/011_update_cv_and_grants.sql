-- Fix "permission denied for table cvs" + reliable save/version via RPC

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.shops to authenticated;
grant all on public.shops to service_role;

grant select, insert, update, delete on public.employees to authenticated;
grant all on public.employees to service_role;

grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;

grant select, insert, update, delete on public.cvs to authenticated;
grant all on public.cvs to service_role;

grant select, insert, update, delete on public.cv_versions to authenticated;
grant all on public.cv_versions to service_role;

grant select, insert, update, delete on public.cv_inputs to authenticated;
grant all on public.cv_inputs to service_role;

grant select, update on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;

grant select, update on public.site_reviews to authenticated;
grant all on public.site_reviews to service_role;
grant select on public.site_reviews to anon;

-- Save / save-version without RLS grant pain (same pattern as get_my_cv)
create or replace function public.update_my_cv(
  p_cv_id uuid,
  p_cv_data jsonb,
  p_create_version boolean default false,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  row_cv public.cvs;
  next_ver int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select shop_id into sid from public.employees where id = uid;
  if sid is null then
    raise exception 'Employee profile not found';
  end if;

  select * into row_cv
  from public.cvs
  where id = p_cv_id
    and shop_id = sid
  for update;

  if not found then
    raise exception 'CV not found';
  end if;

  update public.cvs
  set
    current_data = coalesce(p_cv_data, current_data),
    target_position = coalesce(nullif(p_cv_data->>'targetPosition', ''), target_position),
    template_id = coalesce(
      nullif(p_cv_data->'metadata'->>'templateId', ''),
      template_id,
      'professional'
    ),
    updated_at = now()
  where id = p_cv_id
    and shop_id = sid;

  -- Keep customer contact in sync when present in payload
  update public.customers c
  set
    full_name = coalesce(nullif(p_cv_data->'personal'->>'fullName', ''), c.full_name),
    phone = coalesce(nullif(p_cv_data->'personal'->>'phone', ''), c.phone),
    email = coalesce(nullif(p_cv_data->'personal'->>'email', ''), c.email),
    city = coalesce(nullif(p_cv_data->'personal'->>'city', ''), c.city),
    updated_at = now()
  where c.id = row_cv.customer_id
    and c.shop_id = sid;

  if coalesce(p_create_version, false) then
    select coalesce(max(v.version_number), 0) + 1
      into next_ver
    from public.cv_versions v
    where v.cv_id = p_cv_id;

    insert into public.cv_versions (
      cv_id,
      shop_id,
      version_number,
      data,
      template_id,
      notes,
      created_by
    )
    values (
      p_cv_id,
      sid,
      next_ver,
      coalesce(p_cv_data, row_cv.current_data),
      coalesce(
        nullif(p_cv_data->'metadata'->>'templateId', ''),
        row_cv.template_id,
        'professional'
      ),
      coalesce(nullif(p_notes, ''), 'Version ' || next_ver::text),
      uid
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'cvId', p_cv_id,
    'versionCreated', coalesce(p_create_version, false)
  );
end;
$$;

grant execute on function public.update_my_cv(uuid, jsonb, boolean, text) to authenticated;
