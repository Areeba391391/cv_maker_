-- Fix "permission denied for table contact_messages / site_reviews"

grant select, update on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;

grant select, update on public.site_reviews to authenticated;
grant all on public.site_reviews to service_role;

-- Ensure sequences / defaults work for inserts via service role
grant usage on schema public to authenticated, service_role;
