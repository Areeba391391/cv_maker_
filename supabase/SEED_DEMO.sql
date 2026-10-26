-- Demo data for live launch — run in Supabase SQL Editor after FIX_PERMISSIONS.sql
-- Safe to re-run: skips if matching message/review already exists

insert into public.contact_messages (name, workspace_name, phone, email, message, created_at, read_at)
select * from (values
  (
    'Ahmed Raza',
    'City Careers Shop',
    '03001234001',
    'ahmed@citycareers.pk',
    'We want to use AI CV Maker at our typing centre. How do we add 3 staff users?',
    now() - interval '2 days',
    null::timestamptz
  ),
  (
    'Sara Malik',
    'Bright Path Coaching',
    '03219876002',
    'sara@brightpath.pk',
    'Can we import LinkedIn Save-to-PDF and print A4 the same day?',
    now() - interval '1 day',
    now() - interval '20 hours'
  ),
  (
    'Imran Khan',
    'Campus Career Desk',
    '03331234003',
    null,
    'Need ATS-safe template for students applying to portals. Demo please.',
    now() - interval '5 hours',
    null::timestamptz
  )
) as v(name, workspace_name, phone, email, message, created_at, read_at)
where not exists (
  select 1 from public.contact_messages c where c.message = v.message
);

insert into public.site_reviews (name, workspace_name, rating, message, created_at, approved_at)
select * from (values
  (
    'Nadia Hussain',
    'Quick Print & CV',
    5,
    'Walk-in customers leave with a clean English CV in minutes. LinkedIn paste alone saves us so much typing.',
    now() - interval '12 days',
    now() - interval '11 days'
  ),
  (
    'Bilal Ahmed',
    'Horizon Tutors',
    5,
    'ATS template is exactly what our students need for job portals. No fake schools — that honesty matters.',
    now() - interval '9 days',
    now() - interval '8 days'
  ),
  (
    'Fatima Noor',
    'DeskWorks Freelancers',
    4,
    'Templates look senior on paper. Clients ask which software we use — we just smile and print.',
    now() - interval '6 days',
    now() - interval '5 days'
  ),
  (
    'Usman Ali',
    'Market Road Computers',
    5,
    'Generate is fast under desk pressure. Staff picked it up in one afternoon.',
    now() - interval '3 days',
    now() - interval '2 days'
  ),
  (
    'Ayesha Siddiqui',
    'School Placement Cell',
    5,
    'Clear controls, honest English, PDF ready before the next student walks in.',
    now() - interval '1 day',
    now() - interval '12 hours'
  ),
  (
    'Omar Farooq',
    null,
    4,
    'Tried the contact flow — reply was clear. Setting up our shop workspace next week.',
    now() - interval '8 hours',
    null::timestamptz
  )
) as v(name, workspace_name, rating, message, created_at, approved_at)
where not exists (
  select 1 from public.site_reviews r where r.message = v.message
);

-- Public marketing can read only approved reviews (optional; app also uses service role)
drop policy if exists "public_read_approved_reviews" on public.site_reviews;
create policy "public_read_approved_reviews"
  on public.site_reviews
  for select
  to anon, authenticated
  using (approved_at is not null and archived_at is null);

grant select on public.site_reviews to anon;
