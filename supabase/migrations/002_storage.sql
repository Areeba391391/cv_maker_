-- Storage policies for private cv-files bucket
-- Create bucket first: insert into storage.buckets (id, name, public) values ('cv-files', 'cv-files', false);

create policy "Shop members can upload cv files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cv-files'
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);

create policy "Shop members can read own shop files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cv-files'
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);

create policy "Shop members can update own shop files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cv-files'
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);

create policy "Shop members can delete own shop files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cv-files'
  and (storage.foldername(name))[1] = public.current_shop_id()::text
);
