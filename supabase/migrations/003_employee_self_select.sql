-- Bootstrap shop + employee for the currently signed-in auth user.
-- Safe to re-run. Call from app when employee row is missing.

create or replace function public.bootstrap_employee_profile(
  p_full_name text default null,
  p_shop_name text default null
)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.employees;
  new_shop_id uuid;
  emp public.employees;
  v_name text;
  v_shop text;
  v_email text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into existing from public.employees where id = uid;
  if found then
    return existing;
  end if;

  v_name := coalesce(nullif(trim(p_full_name), ''), split_part(coalesce(auth.jwt() ->> 'email', 'employee'), '@', 1));
  v_shop := coalesce(nullif(trim(p_shop_name), ''), 'My Computer Shop');
  v_email := coalesce(auth.jwt() ->> 'email', uid::text || '@local.invalid');

  insert into public.shops (name) values (v_shop) returning id into new_shop_id;

  insert into public.employees (id, shop_id, full_name, email, role)
  values (uid, new_shop_id, v_name, v_email, 'owner')
  returning * into emp;

  return emp;
end;
$$;

grant execute on function public.bootstrap_employee_profile(text, text) to authenticated;

-- Also allow reading own employee row
drop policy if exists "Employees can view self" on public.employees;
create policy "Employees can view self"
  on public.employees for select
  using (id = auth.uid());
