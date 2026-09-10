-- Beyond Menu Studio: My Place asset support.
-- Allows an authenticated restaurant owner to list/read their own menu image
-- folder so My Place can show the logo and venue reference photos.

update storage.buckets
set file_size_limit = 8388608
where id = 'menu-item-images';

drop policy if exists "Menu item image owners read" on storage.objects;
create policy "Menu item image owners read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'menu-item-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
