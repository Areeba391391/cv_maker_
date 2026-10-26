-- Admins (owner/manager) can browse customers.
-- Regular employees can still create/update customers while generating CVs,
-- but cannot list the customer directory.

create or replace function public.is_shop_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees
    where id = auth.uid()
      and role in ('owner', 'manager')
  );
$$;

grant execute on function public.is_shop_admin() to authenticated;

-- Customers: split read vs write
drop policy if exists "Shop employees manage customers" on public.customers;

create policy "Admins can view customers"
  on public.customers for select
  using (
    shop_id in (select shop_id from public.employees where id = auth.uid())
    and public.is_shop_admin()
  );

create policy "Shop staff can insert customers"
  on public.customers for insert
  with check (
    shop_id in (select shop_id from public.employees where id = auth.uid())
  );

create policy "Shop staff can update customers"
  on public.customers for update
  using (
    shop_id in (select shop_id from public.employees where id = auth.uid())
  )
  with check (
    shop_id in (select shop_id from public.employees where id = auth.uid())
  );

create policy "Admins can delete customers"
  on public.customers for delete
  using (
    shop_id in (select shop_id from public.employees where id = auth.uid())
    and public.is_shop_admin()
  );

-- Admins can list other employees in the same shop
drop policy if exists "Employees can view shop staff" on public.employees;
create policy "Employees can view shop staff"
  on public.employees for select
  using (
    id = auth.uid()
    or (
      public.is_shop_admin()
      and shop_id = public.current_shop_id()
    )
  );
