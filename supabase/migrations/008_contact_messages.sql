-- Site-wide contact inbox (marketing form → admin desk)

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

-- Inserts go through service-role API only (no anon insert policy).

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
