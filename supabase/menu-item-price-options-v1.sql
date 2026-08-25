-- BEYOND flexible item price options
-- Keeps legacy menu_items.price for backward compatibility.

alter table public.menu_items
add column if not exists price_options jsonb
not null
default '[]'::jsonb;

comment on column public.menu_items.price_options is
'Flexible menu price options. Example:
[
  {"label_key":"shot","label_en":"Shot","label_he":"שוט","price":"25"},
  {"label_key":"glass","label_en":"Glass","label_he":"כוס","price":"40"}
]';
