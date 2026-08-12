-- BEYOND Saved Projects + Beyond Community — current database schema
-- Safe to run again. Existing private projects remain private.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled Project',
  project_type text not null default 'creator',
  project_data jsonb not null default '{}'::jsonb,
  thumbnail_url text,
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects
  for select
  using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects
  for delete
  using (auth.uid() = user_id);

-- Public Community layer. This table contains only items a user explicitly publishes.
create table if not exists public.community_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('project', 'ai_model')),
  source_id uuid not null,
  title text not null default 'Untitled Creation',
  description text not null default '',
  tags text[] not null default '{}'::text[],
  thumbnail_url text,
  creator_name text not null default 'BEYOND Creator',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create index if not exists community_items_created_idx
  on public.community_items (created_at desc);
create index if not exists community_items_source_idx
  on public.community_items (source_type, source_id);

alter table public.community_items enable row level security;

drop policy if exists "community_items_public_read" on public.community_items;
create policy "community_items_public_read"
  on public.community_items
  for select
  using (true);

drop policy if exists "community_items_insert_own" on public.community_items;
create policy "community_items_insert_own"
  on public.community_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_items_update_own" on public.community_items;
create policy "community_items_update_own"
  on public.community_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "community_items_delete_own" on public.community_items;
create policy "community_items_delete_own"
  on public.community_items
  for delete
  using (auth.uid() = user_id);

create table if not exists public.community_likes (
  item_id uuid not null references public.community_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index if not exists community_likes_item_idx
  on public.community_likes (item_id);

alter table public.community_likes enable row level security;

drop policy if exists "community_likes_public_read" on public.community_likes;
create policy "community_likes_public_read"
  on public.community_likes
  for select
  using (true);

drop policy if exists "community_likes_insert_own" on public.community_likes;
create policy "community_likes_insert_own"
  on public.community_likes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_likes_delete_own" on public.community_likes;
create policy "community_likes_delete_own"
  on public.community_likes
  for delete
  using (auth.uid() = user_id);

-- Deliberately no public SELECT policy is added to public.projects.
-- Beyond Community reads only public.community_items snapshots.


-- Community comments / discussion.
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.community_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_name text not null default 'BEYOND Creator',
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists community_comments_item_created_idx
  on public.community_comments (item_id, created_at asc);

alter table public.community_comments enable row level security;

drop policy if exists "community_comments_public_read" on public.community_comments;
create policy "community_comments_public_read"
  on public.community_comments
  for select
  using (true);

drop policy if exists "community_comments_insert_own" on public.community_comments;
create policy "community_comments_insert_own"
  on public.community_comments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_comments_delete_own" on public.community_comments;
create policy "community_comments_delete_own"
  on public.community_comments
  for delete
  using (auth.uid() = user_id);

-- Community creator following / personalized Following feed.
create table if not exists public.community_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_user_id),
  check (follower_id <> creator_user_id)
);

create index if not exists community_follows_creator_idx
  on public.community_follows (creator_user_id, created_at desc);
create index if not exists community_follows_follower_idx
  on public.community_follows (follower_id, created_at desc);

alter table public.community_follows enable row level security;

drop policy if exists "community_follows_public_read" on public.community_follows;
create policy "community_follows_public_read"
  on public.community_follows
  for select
  using (true);

drop policy if exists "community_follows_insert_own" on public.community_follows;
create policy "community_follows_insert_own"
  on public.community_follows
  for insert
  with check (auth.uid() = follower_id and follower_id <> creator_user_id);

drop policy if exists "community_follows_delete_own" on public.community_follows;
create policy "community_follows_delete_own"
  on public.community_follows
  for delete
  using (auth.uid() = follower_id);



-- Private Saved creations / bookmarks. Only the saving user can read/write them.
create table if not exists public.community_saves (
  item_id uuid not null references public.community_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index if not exists community_saves_user_created_idx
  on public.community_saves (user_id, created_at desc);

alter table public.community_saves enable row level security;

drop policy if exists "community_saves_select_own" on public.community_saves;
create policy "community_saves_select_own"
  on public.community_saves
  for select
  using (auth.uid() = user_id);

drop policy if exists "community_saves_insert_own" on public.community_saves;
create policy "community_saves_insert_own"
  on public.community_saves
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "community_saves_delete_own" on public.community_saves;
create policy "community_saves_delete_own"
  on public.community_saves
  for delete
  using (auth.uid() = user_id);
