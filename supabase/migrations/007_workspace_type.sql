-- Generalize shops beyond computer-shop-only use cases.
alter table public.shops
  add column if not exists workspace_type text not null default 'general';

alter table public.shops
  drop constraint if exists shops_workspace_type_check;

alter table public.shops
  add constraint shops_workspace_type_check
  check (
    workspace_type in (
      'general',
      'computer_shop',
      'typing_center',
      'career_coach',
      'education',
      'hr_desk',
      'freelancer',
      'other'
    )
  );

comment on column public.shops.workspace_type is
  'Industry profile for labels and defaults. Does not change core CV engine.';
