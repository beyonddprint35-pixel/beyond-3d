-- Beyond Menu Studio: Photo Tuning Engine V1 metadata
-- Additive migration. Existing menu item photos continue working unchanged.

alter table public.menu_items
  add column if not exists image_original_url text,
  add column if not exists image_original_path text,
  add column if not exists image_processed_url text,
  add column if not exists image_processed_path text,
  add column if not exists image_variant text,
  add column if not exists image_status text,
  add column if not exists image_quality_score integer,
  add column if not exists image_quality_level text,
  add column if not exists image_quality_notes jsonb not null default '[]'::jsonb,
  add column if not exists image_processing_profile text,
  add column if not exists image_processed_at timestamptz,
  add column if not exists image_width integer,
  add column if not exists image_height integer;

alter table public.menu_items
  drop constraint if exists menu_items_image_quality_score_range;

alter table public.menu_items
  add constraint menu_items_image_quality_score_range
  check (image_quality_score is null or image_quality_score between 0 and 100);

alter table public.menu_items
  drop constraint if exists menu_items_image_variant_allowed;

alter table public.menu_items
  add constraint menu_items_image_variant_allowed
  check (image_variant is null or image_variant in ('original','enhanced','theme','ai'));

comment on column public.menu_items.image_processing_profile is
  'Beyond photo processing profile, e.g. natural-auto-v1. AI/theme profiles can be added without changing image_url consumers.';
