-- Tha Garden: catalog (bands, venues, shows, tracks) + listener data (profiles, likes, playlists, plays).
-- Catalog tables are public read-only; writes go through the secret key (migration/admin scripts).
-- Listener tables are owned by the signed-in user via RLS.

create extension if not exists pg_trgm with schema extensions;

-- ---------- catalog ----------

create table public.bands (
  id integer primary key,                 -- kept from the Mongo `bands.id` so existing links survive
  name text not null unique,
  short_name text,
  use_short_name boolean not null default false,
  image_url text,
  bio text,
  founded text,
  instagram text,
  twitter text,
  youtube text,
  created_at timestamptz not null default now()
);

create table public.venues (
  slug text primary key,
  name text not null,
  aka text[] not null default '{}',
  address text,
  city text,
  state text,
  lat double precision,
  lng double precision,
  years_active text,
  status text,
  now text,
  summary text,
  history text,
  gogo_impact text,
  notable_bands text[] not null default '{}',
  memories jsonb not null default '[]',   -- [{quote, author, source_url, date}]
  photos jsonb not null default '[]',     -- [{url, credit, source_url, caption, kind, license}]
  sources jsonb not null default '[]',
  related text[] not null default '{}',
  confidence text check (confidence in ('high', 'medium', 'low')),
  notes text,
  updated_at timestamptz not null default now()
);

-- A show is one tape: a live PA night (dated, at a venue) or a studio CD / mixtape / singles bucket.
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  band_id integer not null references public.bands (id),
  label text not null,                    -- original album string, e.g. "12-15-07 @ Largo High School"
  kind text not null check (kind in ('live', 'tape')),
  show_date date,
  venue_slug text references public.venues (slug),
  venue_raw text,                         -- venue text as written on the tape
  disc integer,
  image_url text,                         -- album art; the UI falls back to the band photo
  created_at timestamptz not null default now(),
  unique (band_id, label)
);
create index shows_band_idx on public.shows (band_id);
create index shows_venue_idx on public.shows (venue_slug);
create index shows_date_idx on public.shows (show_date desc nulls last);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,                  -- Mongo music._id
  show_id uuid not null references public.shows (id) on delete cascade,
  band_id integer not null references public.bands (id),
  title text not null,
  position integer,
  duration integer not null default 0,    -- seconds
  audio_url text not null unique,
  image_url text,
  streams integer not null default 0,
  source text,
  created_at timestamptz not null default now(),
  last_played_at timestamptz
);
create index tracks_show_idx on public.tracks (show_id, position);
create index tracks_band_idx on public.tracks (band_id);
create index tracks_streams_idx on public.tracks (streams desc);
create index tracks_title_trgm on public.tracks using gin (title extensions.gin_trgm_ops);

-- ---------- listeners ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index likes_track_idx on public.likes (track_id);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playlists_owner_idx on public.playlists (owner_id);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

create table public.plays (
  id bigint generated always as identity primary key,
  track_id uuid not null references public.tracks (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  played_at timestamptz not null default now()
);
create index plays_track_idx on public.plays (track_id, played_at desc);
create index plays_user_idx on public.plays (user_id, played_at desc);

-- New auth users get a profile row.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Counted stream (called by the player after 30s). The only way listeners can bump `streams`.
create function public.record_stream(p_track_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.tracks set streams = streams + 1, last_played_at = now() where id = p_track_id;
  insert into public.plays (track_id, user_id)
  select p_track_id, (select auth.uid()) where exists (select 1 from public.tracks where id = p_track_id);
$$;
revoke all on function public.record_stream(uuid) from public;
grant execute on function public.record_stream(uuid) to anon, authenticated;

-- ---------- RLS ----------

alter table public.bands enable row level security;
alter table public.venues enable row level security;
alter table public.shows enable row level security;
alter table public.tracks enable row level security;
alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.plays enable row level security;

create policy "catalog is public" on public.bands for select to anon, authenticated using (true);
create policy "catalog is public" on public.venues for select to anon, authenticated using (true);
create policy "catalog is public" on public.shows for select to anon, authenticated using (true);
create policy "catalog is public" on public.tracks for select to anon, authenticated using (true);

create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "read own likes" on public.likes for select to authenticated using ((select auth.uid()) = user_id);
create policy "add own likes" on public.likes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "remove own likes" on public.likes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "read public or own playlists" on public.playlists for select to anon, authenticated
  using (is_public or (select auth.uid()) = owner_id);
create policy "create own playlists" on public.playlists for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "edit own playlists" on public.playlists for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "delete own playlists" on public.playlists for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "read tracks of visible playlists" on public.playlist_tracks for select to anon, authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and (p.is_public or p.owner_id = (select auth.uid()))));
create policy "add to own playlists" on public.playlist_tracks for insert to authenticated
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())));
create policy "reorder own playlists" on public.playlist_tracks for update to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())));
create policy "remove from own playlists" on public.playlist_tracks for delete to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())));

create policy "read own plays" on public.plays for select to authenticated using ((select auth.uid()) = user_id);
