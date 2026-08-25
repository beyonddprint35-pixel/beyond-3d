-- ============================================================
-- BEYOND MENU SUBCATEGORIES V1
--
-- Adds real subcategories to the restaurant menu system.
--
-- IMPORTANT
-- Existing menu_items.category / category_en / category_he
-- are intentionally preserved for backward compatibility.
-- ============================================================


begin;


-- ============================================================
-- 1. SUBCATEGORY TABLE
-- ============================================================

create table if not exists public.menu_subcategories (

  id uuid primary key
    default gen_random_uuid(),

  site_id uuid not null
    references public.menu_sites(id)
    on delete cascade,

  section_id uuid not null
    references public.menu_sections(id)
    on delete cascade,

  name_en text,

  name_he text,

  visible boolean
    not null
    default true,

  sort_order integer
    not null
    default 0,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint menu_subcategories_has_name
    check (
      nullif(btrim(coalesce(name_en, '')), '') is not null
      or
      nullif(btrim(coalesce(name_he, '')), '') is not null
    )
);


-- Prevent duplicate subcategories inside the same category.
create unique index if not exists
menu_subcategories_section_names_uidx
on public.menu_subcategories (
  section_id,
  coalesce(
    lower(
      nullif(
        btrim(name_en),
        ''
      )
    ),
    ''
  ),
  coalesce(
    lower(
      nullif(
        btrim(name_he),
        ''
      )
    ),
    ''
  )
);


create index if not exists
menu_subcategories_site_idx
on public.menu_subcategories(site_id);


create index if not exists
menu_subcategories_section_idx
on public.menu_subcategories(
  section_id,
  sort_order
);


-- ============================================================
-- 2. LINK ITEMS TO SUBCATEGORIES
-- ============================================================

alter table public.menu_items
add column if not exists subcategory_id uuid;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'menu_items_subcategory_id_fkey'
  ) then

    alter table public.menu_items
    add constraint
      menu_items_subcategory_id_fkey
    foreign key (
      subcategory_id
    )
    references public.menu_subcategories(id)
    on delete set null;

  end if;

end;
$$;


create index if not exists
menu_items_subcategory_idx
on public.menu_items(
  subcategory_id,
  sort_order
);


-- ============================================================
-- 3. MIGRATE EXISTING ITEM SUBCATEGORIES
--
-- Existing system stores:
--
-- category_en
-- category_he
-- category
--
-- We convert each distinct pair into one real subcategory.
-- ============================================================

insert into public.menu_subcategories (
  site_id,
  section_id,
  name_en,
  name_he,
  sort_order
)

select
  source.site_id,
  source.section_id,
  source.name_en,
  source.name_he,
  source.first_sort_order

from (

  select

    mi.site_id,

    mi.section_id,

    nullif(
      btrim(
        coalesce(
          mi.category_en,

          case
            when
              nullif(
                btrim(
                  coalesce(
                    mi.category_he,
                    ''
                  )
                ),
                ''
              ) is null
            then mi.category
            else null
          end
        )
      ),
      ''
    ) as name_en,

    nullif(
      btrim(
        mi.category_he
      ),
      ''
    ) as name_he,

    min(
      coalesce(
        mi.sort_order,
        0
      )
    ) as first_sort_order

  from public.menu_items mi

  where
    nullif(
      btrim(
        coalesce(
          mi.category_en,
          ''
        )
      ),
      ''
    ) is not null

    or

    nullif(
      btrim(
        coalesce(
          mi.category_he,
          ''
        )
      ),
      ''
    ) is not null

    or

    nullif(
      btrim(
        coalesce(
          mi.category,
          ''
        )
      ),
      ''
    ) is not null

  group by

    mi.site_id,

    mi.section_id,

    nullif(
      btrim(
        coalesce(
          mi.category_en,

          case
            when
              nullif(
                btrim(
                  coalesce(
                    mi.category_he,
                    ''
                  )
                ),
                ''
              ) is null
            then mi.category
            else null
          end
        )
      ),
      ''
    ),

    nullif(
      btrim(
        mi.category_he
      ),
      ''
    )

) source

on conflict do nothing;


-- ============================================================
-- 4. LINK EXISTING ITEMS
-- ============================================================

update public.menu_items mi

set subcategory_id =
  ms.id

from public.menu_subcategories ms

where
  mi.subcategory_id is null

  and

  ms.site_id =
    mi.site_id

  and

  ms.section_id =
    mi.section_id

  and

  coalesce(
    lower(
      nullif(
        btrim(
          ms.name_en
        ),
        ''
      )
    ),
    ''
  )
  =
  coalesce(
    lower(
      nullif(
        btrim(
          coalesce(
            mi.category_en,

            case
              when
                nullif(
                  btrim(
                    coalesce(
                      mi.category_he,
                      ''
                    )
                  ),
                  ''
                ) is null
              then mi.category
              else null
            end
          )
        ),
        ''
      )
    ),
    ''
  )

  and

  coalesce(
    lower(
      nullif(
        btrim(
          ms.name_he
        ),
        ''
      )
    ),
    ''
  )
  =
  coalesce(
    lower(
      nullif(
        btrim(
          mi.category_he
        ),
        ''
      )
    ),
    ''
  );


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.menu_subcategories
enable row level security;


-- ------------------------------------------------------------
-- PUBLIC CUSTOMER READ
--
-- Customers can read subcategories only when the
-- restaurant menu itself is published.
-- ------------------------------------------------------------

drop policy if exists
  "public reads published menu subcategories"
on public.menu_subcategories;


create policy
  "public reads published menu subcategories"

on public.menu_subcategories

for select

to anon, authenticated

using (

  exists (

    select 1

    from public.menu_sites site

    where
      site.id =
        menu_subcategories.site_id

      and

      site.published = true

  )

);


-- ------------------------------------------------------------
-- RESTAURANT OWNER / ADMIN READ
-- ------------------------------------------------------------

drop policy if exists
  "owners and admins read menu subcategories"
on public.menu_subcategories;


create policy
  "owners and admins read menu subcategories"

on public.menu_subcategories

for select

to authenticated

using (

  exists (

    select 1

    from public.menu_sites site

    where
      site.id =
        menu_subcategories.site_id

      and (

        site.owner_id =
          (select auth.uid())

        or

        (select private.is_menu_admin())

      )

  )

);


-- ------------------------------------------------------------
-- INSERT
-- ------------------------------------------------------------

drop policy if exists
  "owners and admins create menu subcategories"
on public.menu_subcategories;


create policy
  "owners and admins create menu subcategories"

on public.menu_subcategories

for insert

to authenticated

with check (

  exists (

    select 1

    from public.menu_sites site

    join public.menu_sections section
      on section.site_id =
         site.id

    where
      site.id =
        menu_subcategories.site_id

      and

      section.id =
        menu_subcategories.section_id

      and (

        site.owner_id =
          (select auth.uid())

        or

        (select private.is_menu_admin())

      )

  )

);


-- ------------------------------------------------------------
-- UPDATE
-- ------------------------------------------------------------

drop policy if exists
  "owners and admins update menu subcategories"
on public.menu_subcategories;


create policy
  "owners and admins update menu subcategories"

on public.menu_subcategories

for update

to authenticated

using (

  exists (

    select 1

    from public.menu_sites site

    where
      site.id =
        menu_subcategories.site_id

      and (

        site.owner_id =
          (select auth.uid())

        or

        (select private.is_menu_admin())

      )

  )

)

with check (

  exists (

    select 1

    from public.menu_sites site

    join public.menu_sections section
      on section.site_id =
         site.id

    where
      site.id =
        menu_subcategories.site_id

      and

      section.id =
        menu_subcategories.section_id

      and (

        site.owner_id =
          (select auth.uid())

        or

        (select private.is_menu_admin())

      )

  )

);


-- ------------------------------------------------------------
-- DELETE
-- ------------------------------------------------------------

drop policy if exists
  "owners and admins delete menu subcategories"
on public.menu_subcategories;


create policy
  "owners and admins delete menu subcategories"

on public.menu_subcategories

for delete

to authenticated

using (

  exists (

    select 1

    from public.menu_sites site

    where
      site.id =
        menu_subcategories.site_id

      and (

        site.owner_id =
          (select auth.uid())

        or

        (select private.is_menu_admin())

      )

  )

);


-- ============================================================
-- 6. PRIVILEGES
-- ============================================================

revoke all
on public.menu_subcategories
from anon;


revoke all
on public.menu_subcategories
from authenticated;


grant select
on public.menu_subcategories
to anon;


grant
  select,
  insert,
  update,
  delete

on public.menu_subcategories

to authenticated;


-- Existing menu_items privileges already apply to
-- the new subcategory_id column.


commit;


-- ============================================================
-- VALIDATION
-- ============================================================

select
  count(*) as subcategories_created
from public.menu_subcategories;


select
  count(*) as items_linked_to_subcategory
from public.menu_items
where subcategory_id is not null;


select
  count(*) as legacy_subcategory_items_not_linked
from public.menu_items
where
  subcategory_id is null
  and (
    nullif(
      btrim(
        coalesce(
          category_en,
          ''
        )
      ),
      ''
    ) is not null

    or

    nullif(
      btrim(
        coalesce(
          category_he,
          ''
        )
      ),
      ''
    ) is not null

    or

    nullif(
      btrim(
        coalesce(
          category,
          ''
        )
      ),
      ''
    ) is not null
  );
