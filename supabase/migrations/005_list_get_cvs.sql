-- Reliable read helpers for shop CVs (bypass brittle RLS joins)

create or replace function public.list_my_cvs(p_limit int default 20)
returns table (
  id uuid,
  target_position text,
  updated_at timestamptz,
  customer_name text,
  customer_phone text,
  customer_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select shop_id into sid from public.employees where employees.id = uid;
  if sid is null then
    return;
  end if;

  return query
  select
    c.id,
    c.target_position,
    c.updated_at,
    cust.full_name,
    cust.phone,
    c.customer_id
  from public.cvs c
  left join public.customers cust on cust.id = c.customer_id
  where c.shop_id = sid
  order by c.updated_at desc
  limit greatest(coalesce(p_limit, 20), 1);
end;
$$;

grant execute on function public.list_my_cvs(int) to authenticated;

create or replace function public.get_my_cv(p_cv_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  row_cv public.cvs;
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
    and shop_id = sid;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', row_cv.id,
    'customer_id', row_cv.customer_id,
    'target_position', row_cv.target_position,
    'template_id', row_cv.template_id,
    'current_data', row_cv.current_data,
    'status', row_cv.status,
    'updated_at', row_cv.updated_at
  );
end;
$$;

grant execute on function public.get_my_cv(uuid) to authenticated;

-- Broader RLS: match shop via employees subquery (more reliable than only helper)
drop policy if exists "Shop employees manage customers" on public.customers;
create policy "Shop employees manage customers"
  on public.customers for all
  using (shop_id in (select shop_id from public.employees where id = auth.uid()))
  with check (shop_id in (select shop_id from public.employees where id = auth.uid()));

drop policy if exists "Shop employees manage cvs" on public.cvs;
create policy "Shop employees manage cvs"
  on public.cvs for all
  using (shop_id in (select shop_id from public.employees where id = auth.uid()))
  with check (shop_id in (select shop_id from public.employees where id = auth.uid()));

drop policy if exists "Shop employees manage cv_versions" on public.cv_versions;
create policy "Shop employees manage cv_versions"
  on public.cv_versions for all
  using (shop_id in (select shop_id from public.employees where id = auth.uid()))
  with check (shop_id in (select shop_id from public.employees where id = auth.uid()));
