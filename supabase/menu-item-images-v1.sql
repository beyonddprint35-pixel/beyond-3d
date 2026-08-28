-- Beyond Menu Studio: item photo storage
-- Applied to Supabase project bxxrgijespvwjarkdtwp as migration add_menu_item_image_storage.

alter table public.menu_items
  add column if not exists image_url text,
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-item-images',
  'menu-item-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Menu item image owners upload" on storage.objects;
create policy "Menu item image owners upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-item-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Menu item image owners update" on storage.objects;
create policy "Menu item image owners update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-item-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'menu-item-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Menu item image owners delete" on storage.objects;
create policy "Menu item image owners delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-item-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
