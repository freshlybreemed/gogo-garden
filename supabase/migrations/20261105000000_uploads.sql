-- Listener uploads: files go to Storage bucket `uploads` under <user id>/<upload id>/,
-- and each submission is an `uploads` row. Uploads go live immediately; admins can hide them.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 52428800,
        array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Signed-in users can write only inside their own folder; the bucket is public-read for playback.
create policy "upload into own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own uploads" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  band_id integer references public.bands (id),
  new_band_name text check (new_band_name is null or char_length(new_band_name) between 1 and 80),
  title text not null check (char_length(title) between 1 and 160),
  kind text not null check (kind in ('live', 'studio', 'mixtape', 'single')),
  show_date date,
  venue_slug text references public.venues (slug),
  venue_text text check (venue_text is null or char_length(venue_text) <= 120),
  cover_path text,
  track_count integer not null default 0 check (track_count between 0 and 40),
  status text not null default 'live' check (status in ('live', 'hidden')),
  show_id uuid references public.shows (id) on delete set null,
  created_at timestamptz not null default now(),
  check (band_id is not null or new_band_name is not null)
);
create index uploads_user_idx on public.uploads (user_id, created_at desc);
create index uploads_created_idx on public.uploads (created_at desc);

alter table public.uploads enable row level security;
create policy "read own uploads" on public.uploads for select to authenticated using ((select auth.uid()) = user_id);
-- Inserts and status changes happen server-side with the secret key (after validation), not from the browser.

-- Shows/tracks remember which upload they came from, so an upload can be hidden as a unit.
alter table public.shows add column if not exists upload_id uuid references public.uploads (id) on delete set null;
alter table public.tracks add column if not exists upload_id uuid references public.uploads (id) on delete set null;
alter table public.tracks add column if not exists hidden boolean not null default false;
create index if not exists tracks_upload_idx on public.tracks (upload_id);

-- Rule: at most 5 uploads per person per rolling day (enforced in the database, not just the UI).
create function public.enforce_upload_rate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.uploads where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'upload limit reached: 5 per day' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger uploads_rate before insert on public.uploads
  for each row execute function public.enforce_upload_rate();

-- Hidden tracks drop out of the public catalog.
drop policy if exists "catalog is public" on public.tracks;
create policy "catalog is public" on public.tracks for select to anon, authenticated using (not hidden);
