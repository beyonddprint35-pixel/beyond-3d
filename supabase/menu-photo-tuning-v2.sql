-- Beyond Menu Studio: Photo Tuning Engine V2
-- Stores the theme-matched derivative separately from the real original and natural enhancement.

alter table public.menu_items
  add column if not exists image_theme_url text,
  add column if not exists image_theme_path text,
  add column if not exists image_theme_profile text,
  add column if not exists image_theme_processed_at timestamptz;

comment on column public.menu_items.image_theme_profile is
  'Versioned Beyond photographic grade matched to the active menu presentation, e.g. dark-cinematic-v1.';

comment on column public.menu_items.image_theme_url is
  'Public URL of the non-generative theme-matched derivative. The original dish remains preserved separately.';
