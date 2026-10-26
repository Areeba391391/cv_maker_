-- AI CV Maker — Supabase schema
-- Run in Supabase SQL Editor or via CLI migrations

create extension if not exists "pgcrypto";

-- Shops
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Employees linked to auth.users
create table if not exists public.employees (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'employee' check (role in ('owner', 'manager', 'employee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_shop_id_idx on public.employees(shop_id);

-- Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  city text,
  notes text,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_shop_id_idx on public.customers(shop_id);
create index if not exists customers_phone_idx on public.customers(phone);
create index if not exists customers_email_idx on public.customers(email);
create index if not exists customers_full_name_idx on public.customers(full_name);

-- CVs
create table if not exists public.cvs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  target_position text not null,
  template_id text not null default 'professional',
  current_data jsonb not null default '{}'::jsonb,
  photo_path text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cvs_shop_id_idx on public.cvs(shop_id);
create index if not exists cvs_customer_id_idx on public.cvs(customer_id);

-- CV Versions
create table if not exists public.cv_versions (
  id uuid primary key default gen_random_uuid(),
  cv_id uuid not null references public.cvs(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  version_number int not null,
  data jsonb not null,
  template_id text not null default 'professional',
  notes text,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now(),
  unique (cv_id, version_number)
);

create index if not exists cv_versions_cv_id_idx on public.cv_versions(cv_id);

-- Uploaded source files metadata
create table if not exists public.cv_inputs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  cv_id uuid references public.cvs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  input_type text not null check (input_type in ('text', 'voice', 'image', 'pdf', 'doc', 'docx', 'cv_image', 'photo')),
  storage_path text,
  extracted_text text,
  mime_type text,
  file_name text,
  created_by uuid references public.employees(id),
  created_at timestamptz not null default now()
);

-- Helper: current employee's shop
create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from public.employees where id = auth.uid()
$$;

-- Auto-create employee + shop on signup (optional trigger via edge or app)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_shop_id uuid;
  shop_name text;
  employee_name text;
begin
  shop_name := coalesce(new.raw_user_meta_data->>'shop_name', 'My Computer Shop');
  employee_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.shops (name) values (shop_name) returning id into new_shop_id;

  insert into public.employees (id, shop_id, full_name, email, role)
  values (new.id, new_shop_id, employee_name, new.email, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.shops enable row level security;
alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.cvs enable row level security;
alter table public.cv_versions enable row level security;
alter table public.cv_inputs enable row level security;

-- Shops policies
create policy "Employees can view own shop"
  on public.shops for select
  using (id = public.current_shop_id());

create policy "Owners can update own shop"
  on public.shops for update
  using (id = public.current_shop_id());

-- Employees policies
create policy "Employees can view shop colleagues"
  on public.employees for select
  using (shop_id = public.current_shop_id());

create policy "Employees can update self"
  on public.employees for update
  using (id = auth.uid());

-- Customers
create policy "Shop employees manage customers"
  on public.customers for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- CVs
create policy "Shop employees manage cvs"
  on public.cvs for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- Versions
create policy "Shop employees manage cv_versions"
  on public.cv_versions for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- Inputs
create policy "Shop employees manage cv_inputs"
  on public.cv_inputs for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- Storage buckets (run separately in dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('cv-files', 'cv-files', false);
