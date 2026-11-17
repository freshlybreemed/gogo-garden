import 'server-only';
import { getDb } from './db';
import { supabaseAdmin } from './supabase/admin';

/**
 * Diggers: the listeners who fill in the archive. One point per song they named,
 * band fact they added, and track they uploaded. Reverted edits don't count, and
 * renaming the same song twice is still one song.
 */
export type Digger = {
  userId: string;
  name: string;
  handle: string | null;
  named: number;
  bandEdits: number;
  tapes: number;
  tracks: number;
  points: number;
};

const TTL_MS = 5 * 60_000;
const g = globalThis as unknown as { _diggers?: { at: number; promise: Promise<Digger[]> } };

export function getDiggers(): Promise<Digger[]> {
  const now = Date.now();
  if (!g._diggers || now - g._diggers.at > TTL_MS) {
    const promise = loadDiggers();
    g._diggers = { at: now, promise };
    promise.catch(() => {
      if (g._diggers?.promise === promise) g._diggers = undefined;
    });
  }
  return g._diggers.promise;
}

type Acc = Omit<Digger, 'name' | 'handle' | 'points'> & { email: string };

async function loadDiggers(): Promise<Digger[]> {
  const acc = new Map<string, Acc>();
  const get = (userId: string) => {
    let a = acc.get(userId);
    if (!a) acc.set(userId, (a = { userId, email: '', named: 0, bandEdits: 0, tapes: 0, tracks: 0 }));
    return a;
  };

  // Edits: distinct songs named, distinct band fields touched. Reverts and reverted rows are out.
  const edits = await (await getDb())
    .collection('edits')
    .aggregate<{ _id: { userId: string; entity: string }; things: number; email: string }>([
      { $match: { revertOf: null, revertedAt: null } },
      {
        $group: {
          _id: { userId: '$userId', entity: '$entity' },
          things: { $addToSet: { $cond: [{ $eq: ['$entity', 'track'] }, '$entityId', { $concat: ['$entityId', ':', '$field'] }] } },
          email: { $last: '$userEmail' },
        },
      },
      { $project: { things: { $size: '$things' }, email: 1 } },
    ])
    .toArray();
  for (const e of edits) {
    const a = get(String(e._id.userId));
    if (e._id.entity === 'track') a.named += e.things;
    else a.bandEdits += e.things;
    a.email ||= e.email ?? '';
  }

  // Uploads that are still live.
  const sb = supabaseAdmin();
  const { data: uploads } = await sb.from('uploads').select('user_id, track_count').eq('status', 'live');
  for (const u of uploads ?? []) {
    const a = get(u.user_id as string);
    a.tapes += 1;
    a.tracks += (u.track_count as number) ?? 0;
  }

  const ids = [...acc.keys()];
  if (!ids.length) return [];
  const [{ data: profiles }, { data: users }] = await Promise.all([
    sb.from('profiles').select('id, display_name, handle').in('id', ids),
    sb.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? '']));
  const handleById = new Map((profiles ?? []).map((p) => [p.id as string, (p.handle as string | null) ?? null]));
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? '']));

  return [...acc.values()]
    .map((a) => {
      const email = emailById.get(a.userId) || a.email;
      return {
        userId: a.userId,
        name: publicName(nameById.get(a.userId) ?? '', email),
        handle: handleById.get(a.userId) ?? null,
        named: a.named,
        bandEdits: a.bandEdits,
        tapes: a.tapes,
        tracks: a.tracks,
        points: a.named + a.bandEdits + a.tracks,
      };
    })
    .filter((d) => d.points > 0)
    .sort((a, b) => b.points - a.points || b.named - a.named || a.name.localeCompare(b.name));
}

/**
 * New profiles default their display name to the email's local part. That's not a
 * name anyone chose to show, so it's masked ("e••••a") rather than leaking the address.
 */
export function publicName(displayName: string, email: string) {
  const name = displayName.trim();
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  if (name && name.toLowerCase() !== local) return name;
  const base = name || local;
  if (!base) return 'A digger';
  if (base.length <= 2) return `${base[0]}•`;
  return `${base[0]}${'•'.repeat(Math.min(base.length - 2, 4))}${base[base.length - 1]}`;
}

/**
 * Plays counted on this site: one row in Supabase `plays` per 30-second listen, with the
 * listener when signed in. Not the Mongo `streams` counter, which carries counts from
 * before the site (old imports) and can't say who played what.
 */
export type Listener = {
  userId: string;
  name: string;
  handle: string | null;
  plays: number;
  songs: number;
  topBand: string | null;
  /** Most-played bands, most first: [band, plays]. */
  topBands: [string, number][];
  lastPlayed: string;
};

export type PlayStats = {
  /** Plays per audio URL (the key the catalog and Supabase share). */
  byUrl: Map<string, number>;
  listeners: Listener[];
  total: number;
  /** Plays from listeners who weren't signed in. */
  anon: number;
};

const g2 = globalThis as unknown as { _plays?: { at: number; promise: Promise<PlayStats> } };
const PLAYS_TTL_MS = 60_000;

export function getPlayStats(): Promise<PlayStats> {
  const now = Date.now();
  if (!g2._plays || now - g2._plays.at > PLAYS_TTL_MS) {
    const promise = loadPlays();
    g2._plays = { at: now, promise };
    promise.catch(() => {
      if (g2._plays?.promise === promise) g2._plays = undefined;
    });
  }
  return g2._plays.promise;
}

type PlayRow = { track_id: string; user_id: string | null; played_at: string };

async function loadPlays(): Promise<PlayStats> {
  const sb = supabaseAdmin();
  // Page through every play (RLS hides other people's plays, hence the secret key).
  const rows: PlayRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('plays').select('track_id, user_id, played_at').order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as PlayRow[]));
    if (!data || data.length < PAGE) break;
  }

  const trackIds = [...new Set(rows.map((r) => r.track_id))];
  const trackInfo = new Map<string, { url: string; band: string | null }>();
  for (let i = 0; i < trackIds.length; i += 300) {
    const { data, error } = await sb
      .from('tracks')
      .select('id, audio_url, bands(name, short_name, use_short_name)')
      .in('id', trackIds.slice(i, i + 300));
    if (error) throw error;
    for (const t of data ?? []) {
      const b = t.bands as unknown as { name: string; short_name: string | null; use_short_name: boolean } | null;
      trackInfo.set(t.id as string, { url: t.audio_url as string, band: b ? (b.use_short_name && b.short_name) || b.name : null });
    }
  }

  const byUrl = new Map<string, number>();
  type Acc = { plays: number; songs: Set<string>; bands: Map<string, number>; last: string };
  const byUser = new Map<string, Acc>();
  let anon = 0;
  for (const r of rows) {
    const info = trackInfo.get(r.track_id);
    if (info) byUrl.set(info.url, (byUrl.get(info.url) ?? 0) + 1);
    if (!r.user_id) {
      anon += 1;
      continue;
    }
    let a = byUser.get(r.user_id);
    if (!a) byUser.set(r.user_id, (a = { plays: 0, songs: new Set(), bands: new Map(), last: '' }));
    a.plays += 1;
    a.songs.add(r.track_id);
    if (info?.band) a.bands.set(info.band, (a.bands.get(info.band) ?? 0) + 1);
    if (r.played_at > a.last) a.last = r.played_at;
  }

  const ids = [...byUser.keys()];
  const [{ data: profiles }, { data: users }] = ids.length
    ? await Promise.all([sb.from('profiles').select('id, display_name, handle').in('id', ids), sb.auth.admin.listUsers({ perPage: 1000 })])
    : [{ data: [] }, { data: { users: [] } }];
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? '']));
  const handleById = new Map((profiles ?? []).map((p) => [p.id as string, (p.handle as string | null) ?? null]));
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? '']));

  const listeners = [...byUser.entries()]
    .map(([userId, a]) => {
      const topBands = [...a.bands.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
      return {
        userId,
        name: publicName(nameById.get(userId) ?? '', emailById.get(userId) ?? ''),
        handle: handleById.get(userId) ?? null,
        plays: a.plays,
        songs: a.songs.size,
        topBand: topBands[0]?.[0] ?? null,
        topBands,
        lastPlayed: a.last,
      };
    })
    .sort((a, b) => b.plays - a.plays || b.songs - a.songs || a.name.localeCompare(b.name));

  return { byUrl, listeners, total: rows.length, anon };
}

/** Drop cached boards so a changed name or handle shows up right away. */
export function invalidateLeaderboards() {
  g._diggers = undefined;
  g2._plays = undefined;
}
