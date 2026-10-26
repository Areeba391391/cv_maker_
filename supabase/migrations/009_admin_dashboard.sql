-- Fix contact_messages RLS (employees.id = auth.uid(), not user_id)
-- Ensure contact_messages exists; add site_reviews for admin desk

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  workspace_name text,
  phone text,
  email text,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists "admins_read_contact_messages" on public.contact_messages;
create policy "admins_read_contact_messages"
  on public.contact_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = auth.uid()
        and e.role in ('owner', 'manager')
    )
  );

drop policy if exists "admins_update_contact_messages" on public.contact_messages;
create policy "admins_update_contact_messages"
  on public.contact_messages
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = auth.uid()
        and e.role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.employees e
      where e.id = auth.uid()
        and e.role in ('owner', 'manager')
    )
  );

-- Public / customer reviews (shown in admin; optional approved for marketing)
create table if not exists public.site_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  workspace_name text,
  rating int not null check (rating between 1 and 5),
  message text not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  archived_at timestamptz
);

create index if not exists site_reviews_created_at_idx
  on public.site_reviews (created_at desc);

alter table public.site_reviews enable row level security;

drop policy if exists "admins_read_site_reviews" on public.site_reviews;
create policy "admins_read_site_reviews"
  on public.site_reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = auth.uid()
        and e.role in ('owner', 'manager')
    )
  );

drop policy if exists "admins_update_site_reviews" on public.site_reviews;
create policy "admins_update_site_reviews"
  on public.site_reviews
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.employees e
      where e.id = auth.uid()
        and e.role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.employees e
      where e.id = auth.uid()
        and e.role in ('owner', 'manager')
    )
  );

-- Owners can promote/demote staff roles in their shop
drop policy if exists "Owners update employee roles" on public.employees;
create policy "Owners update employee roles"
  on public.employees
  for update
  to authenticated
  using (
    shop_id = public.current_shop_id()
    and exists (
      select 1 from public.employees me
      where me.id = auth.uid() and me.role = 'owner'
    )
  )
  with check (
    shop_id = public.current_shop_id()
    and exists (
      select 1 from public.employees me
      where me.id = auth.uid() and me.role = 'owner'
    )
  );
