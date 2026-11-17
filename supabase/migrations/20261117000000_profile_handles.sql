-- Listener profiles: a unique @handle (the profile URL, /u/<handle>), a short bio, and an avatar.
-- Handles are lowercase a-z, 0-9 and _, 3-20 characters. Every profile gets one: existing ones are
-- backfilled from the display name, new sign-ups get one from the trigger, and people can change it.

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_handle_format;
alter table public.profiles add constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$');
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 280);
alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 60);
create unique index if not exists profiles_handle_key on public.profiles (handle);

-- A free handle built from `base` ("Ebrima Jobe" -> "ebrimajobe", then "ebrimajobe2", ...).
create or replace function public.free_handle(base text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  stem text := left(regexp_replace(lower(coalesce(base, '')), '[^a-z0-9_]+', '', 'g'), 16);
  candidate text;
  n integer := 1;
begin
  if char_length(stem) < 3 then stem := 'digger'; end if;
  candidate := stem;
  while exists (select 1 from public.profiles where handle = candidate) loop
    n := n + 1;
    candidate := stem || n;
  end loop;
  return candidate;
end;
$$;

-- Backfill. A display name that's just the email's local part isn't something they chose to show,
-- so it isn't used for the handle either.
do $$
declare r record;
begin
  for r in
    select p.id, p.display_name, u.email
    from public.profiles p join auth.users u on u.id = p.id
    where p.handle is null
    order by p.created_at
  loop
    update public.profiles
      set handle = public.free_handle(case when r.display_name = split_part(r.email, '@', 1) then null else r.display_name end)
      where id = r.id;
  end loop;
end;
$$;

alter table public.profiles alter column handle set not null;

-- New users: profile with a display name and a handle.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  insert into public.profiles (id, display_name, handle)
  values (new.id, coalesce(full_name, split_part(new.email, '@', 1)), public.free_handle(full_name));
  return new;
end;
$$;

-- Profile edits go through the server (it checks reserved handles and rate limits), not the browser.
revoke update on public.profiles from anon, authenticated;
drop policy if exists "update own profile" on public.profiles;
