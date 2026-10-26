-- Save customer + CV for the signed-in employee without RLS pain.
-- Verifies auth.uid() owns the shop via employees table.

create or replace function public.save_generated_cv(
  p_shop_id uuid,
  p_target_position text,
  p_template_id text,
  p_cv_data jsonb,
  p_customer_id uuid default null,
  p_full_name text default null,
  p_phone text default null,
  p_email text default null,
  p_city text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  emp public.employees;
  cust_id uuid;
  new_cv_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into emp from public.employees where id = uid;
  if not found then
    raise exception 'Employee profile not found';
  end if;

  if emp.shop_id is distinct from p_shop_id then
    raise exception 'Shop mismatch';
  end if;

  if p_customer_id is not null then
    update public.customers
    set
      full_name = coalesce(p_full_name, full_name),
      phone = coalesce(p_phone, phone),
      email = coalesce(p_email, email),
      city = coalesce(p_city, city),
      updated_at = now()
    where id = p_customer_id
      and shop_id = emp.shop_id
    returning id into cust_id;

    if cust_id is null then
      raise exception 'Customer not found in your shop';
    end if;
  else
    insert into public.customers (shop_id, full_name, phone, email, city, created_by)
    values (emp.shop_id, p_full_name, p_phone, p_email, p_city, uid)
    returning id into cust_id;
  end if;

  insert into public.cvs (
    shop_id,
    customer_id,
    target_position,
    template_id,
    current_data,
    status,
    created_by
  )
  values (
    emp.shop_id,
    cust_id,
    p_target_position,
    coalesce(nullif(p_template_id, ''), 'professional'),
    coalesce(p_cv_data, '{}'::jsonb),
    'ready',
    uid
  )
  returning id into new_cv_id;

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
    new_cv_id,
    emp.shop_id,
    1,
    coalesce(p_cv_data, '{}'::jsonb),
    coalesce(nullif(p_template_id, ''), 'professional'),
    'Initial generation',
    uid
  );

  return jsonb_build_object(
    'cvId', new_cv_id,
    'customerId', cust_id
  );
end;
$$;

grant execute on function public.save_generated_cv(uuid, text, text, jsonb, uuid, text, text, text, text) to authenticated;
