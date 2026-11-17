import 'server-only';
import { getDb } from './db';
import { supabaseAdmin } from './supabase/admin';
import { publicName } from './leaderboard';

/** Listener profiles: `/u/<handle>`. Handles are lowercase a-z, 0-9, _ (3-20), unique. */
export type Profile = {
  id: string;
  handle: string;
  /** Display name safe to show (an email-derived default is masked). */
  name: string;
  /** Raw display name, for the owner's edit form only. */
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/** Handles that would collide with routes, staff, or the site itself. */
const RESERVED = new Set([
  'admin', 'administrator', 'root', 'staff', 'mod', 'moderator', 'support', 'help', 'official', 'system',
  'gogo', 'gogogarden', 'garden', 'thegarden', 'crank', 'me', 'you', 'u', 'user', 'users', 'account', 'settings',
  'login', 'logout', 'signup', 'auth', 'api', 'upload', 'uploads', 'leaderboard', 'bands', 'venues', 'shows',
  'search', 'playlists', 'liked', 'feedback', 'null', 'undefined', 'anonymous', 'digger',
]);

export const profileHref = (handle: string) => `/u/${encodeURIComponent(handle)}`;

/** Lowercase, strip a leading @ and spaces. Returns an error message, or the clean handle. */
export function checkHandle(raw: unknown): { handle: string } | { error: string } {
  const handle = String(raw ?? '').trim().replace(/^@/, '').toLowerCase();
  if (handle.length < 3) return { error: 'Handles are at least 3 characters.' };
  if (handle.length > 20) return { error: 'Keep your handle to 20 characters.' };
  if (!HANDLE_RE.test(handle)) return { error: 'Use letters, numbers and _ only.' };
  if (RESERVED.has(handle)) return { error: `@${handle} is reserved. Try another.` };
  return { handle };
}

type Row = { id: string; handle: string; display_name: string | null; bio: string | null; avatar_url: string | null; created_at: string };
const COLUMNS = 'id, handle, display_name, bio, avatar_url, created_at';

async function toProfiles(rows: Row[]): Promise<Profile[]> {
  if (!rows.length) return [];
  // Emails are only used to spot (and mask) a display name that's just the email's local part.
  const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((data?.users ?? []).map((u) => [u.id, u.email ?? '']));
  return rows.map((r) => ({
    id: r.id,
    handle: r.handle,
    name: publicName(r.display_name ?? '', emailById.get(r.id) ?? ''),
    displayName: r.display_name ?? '',
    bio: r.bio,
    avatarUrl: r.avatar_url,
    createdAt: r.created_at,
  }));
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const clean = handle.toLowerCase();
  if (!HANDLE_RE.test(clean)) return null;
  const { data } = await supabaseAdmin().from('profiles').select(COLUMNS).eq('handle', clean).maybeSingle();
  return data ? (await toProfiles([data as Row]))[0] : null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data } = await supabaseAdmin().from('profiles').select(COLUMNS).eq('id', id).maybeSingle();
  return data ? (await toProfiles([data as Row]))[0] : null;
}

/** Avatars live in the public `uploads` bucket under the user's own folder; anything else is refused. */
export function isOwnAvatarUrl(url: string, userId: string) {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${userId}/avatar/`;
  return url.startsWith(base) && !url.includes('..');
}

export type NamedSong = { trackId: string; title: string; label: string; href: string | null; at: string };

/** Songs this listener named (latest name per song, reverted ones left out), newest first. */
export async function songsNamedBy(userId: string, limit = 12): Promise<NamedSong[]> {
  const rows = await (await getDb())
    .collection('edits')
    .aggregate<{ _id: string; title: string; label: string; href: string | null; at: Date }>([
      { $match: { userId, entity: 'track', field: 'title', revertOf: null, revertedAt: null } },
      { $sort: { at: -1 } },
      { $group: { _id: '$entityId', title: { $first: '$after' }, label: { $first: '$label' }, href: { $first: '$href' }, at: { $first: '$at' } } },
      { $sort: { at: -1 } },
      { $limit: limit },
    ])
    .toArray();
  return rows.map((r) => ({ trackId: String(r._id), title: String(r.title ?? ''), label: String(r.label ?? ''), href: r.href ?? null, at: new Date(r.at).toISOString() }));
}

export type UploadedTape = { id: string; title: string; kind: string; when: string | null; createdAt: string; trackCount: number; audioUrl: string | null };

/** Tapes this listener uploaded that are still live, newest first. */
export async function tapesUploadedBy(userId: string): Promise<UploadedTape[]> {
  const sb = supabaseAdmin();
  const { data: uploads } = await sb
    .from('uploads')
    .select('id, title, kind, show_date, created_at, track_count')
    .eq('user_id', userId)
    .eq('status', 'live')
    .order('created_at', { ascending: false })
    .limit(24);
  const ids = (uploads ?? []).map((u) => u.id as string);
  // One track per upload is enough to find its show in the catalog.
  const { data: tracks } = ids.length
    ? await sb.from('tracks').select('upload_id, audio_url').in('upload_id', ids).eq('hidden', false)
    : { data: [] };
  const urlByUpload = new Map<string, string>();
  for (const t of tracks ?? []) if (!urlByUpload.has(t.upload_id as string)) urlByUpload.set(t.upload_id as string, t.audio_url as string);
  return (uploads ?? []).map((u) => ({
    id: u.id as string,
    title: u.title as string,
    kind: u.kind as string,
    when: (u.show_date as string | null) ?? null,
    createdAt: u.created_at as string,
    trackCount: (u.track_count as number) ?? 0,
    audioUrl: urlByUpload.get(u.id as string) ?? null,
  }));
}
