// One-time copy of the Mongo catalog (bands, venues, music) into Supabase Postgres.
// Idempotent: rows are upserted on their natural keys, so it can be rerun after more imports.
//
//   node --env-file=.env.local scripts/migrate-mongo-to-supabase.mjs [--schema] [--dry]
//
// --schema  applies supabase/migrations/*.sql first (fresh project only)
// --dry     reads and transforms everything, writes nothing
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import pg from 'pg';

const DRY = process.argv.includes('--dry');
const SCHEMA = process.argv.includes('--schema');
const { MONGODB_URI, SUPABASE_DB_URL } = process.env;
if (!MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!DRY && !SUPABASE_DB_URL?.startsWith('postgres')) {
  throw new Error('SUPABASE_DB_URL must be the Postgres connection string (postgresql://...)');
}

const mongo = await MongoClient.connect(MONGODB_URI);
const mdb = mongo.db('music');
const [bands, venues, songs] = await Promise.all([
  mdb.collection('bands').find({}).toArray(),
  mdb.collection('venues').find({}).toArray(),
  mdb.collection('music').find({}).toArray(),
]);
await mongo.close();

const str = (v) => (v === undefined || v === null || v === '' ? null : String(v));
const mostCommon = (vals) => {
  const n = new Map();
  for (const v of vals) if (v) n.set(v, (n.get(v) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

const bandRows = bands.map((b) => ({
  id: Number(b.id), name: String(b.name), short_name: str(b.shortName), use_short_name: Boolean(b.useShortName),
  image_url: str(b.image), bio: str(b.bio || b.description), founded: str(b.founded),
  instagram: str(b.instagram), twitter: str(b.twitter), youtube: str(b.youtube),
}));
const bandIds = new Set(bandRows.map((b) => b.id));
const bandIdByName = new Map(bandRows.map((b) => [b.name.toLowerCase(), b.id]));

const venueRows = venues.map((v) => ({
  slug: v.slug, name: v.name, aka: v.aka ?? [], address: str(v.address), city: str(v.city), state: str(v.state),
  lat: v.lat ?? null, lng: v.lng ?? null, years_active: str(v.years_active), status: str(v.status), now: str(v.now),
  summary: str(v.summary), history: str(v.history), gogo_impact: str(v.gogo_impact),
  notable_bands: v.notable_bands ?? [], memories: JSON.stringify(v.memories ?? []),
  photos: JSON.stringify(v.photos ?? []), sources: JSON.stringify(v.sources ?? []), related: v.related ?? [],
  confidence: v.confidence ?? null, notes: str(v.notes),
}));
const venueSlugs = new Set(venueRows.map((v) => v.slug));

// group songs into shows by band + album label
const showMap = new Map();
const skipped = [];
for (const s of songs) {
  const bandId = bandIds.has(Number(s.artistId)) ? Number(s.artistId) : bandIdByName.get(String(s.artist ?? '').toLowerCase());
  if (bandId === undefined || !s.url) { skipped.push({ id: String(s._id), artist: s.artist, why: 'no band/url' }); continue; }
  const label = str(s.album) ?? 'Singles';
  const k = `${bandId}|${label}`;
  if (!showMap.has(k)) showMap.set(k, { band_id: bandId, label, songs: [] });
  showMap.get(k).songs.push(s);
}
const showRows = [...showMap.values()].map((sh) => {
  const date = mostCommon(sh.songs.map((s) => s.date));
  const venueSlug = mostCommon(sh.songs.map((s) => s.venueSlug));
  const disc = sh.label.match(/\b(?:disc|disk|cd)\s*(\d)\b/i);
  return {
    band_id: sh.band_id, label: sh.label, kind: date || venueSlug || /@/.test(sh.label) ? 'live' : 'tape',
    show_date: /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ? date : null,
    venue_slug: venueSlug && venueSlugs.has(venueSlug) ? venueSlug : null,
    venue_raw: mostCommon(sh.songs.map((s) => s.venueRaw || s.venue)), disc: disc ? Number(disc[1]) : null,
    image_url: mostCommon(sh.songs.map((s) => s.imageUrl)), songs: sh.songs,
  };
});

console.log({ bands: bandRows.length, venues: venueRows.length, shows: showRows.length, tracks: songs.length - skipped.length, skipped });
if (DRY) process.exit(0);

const db = new pg.Client({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

if (SCHEMA) {
  const dir = path.resolve('supabase/migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    console.log('applying', f);
    await db.query(readFileSync(path.join(dir, f), 'utf8'));
  }
}

// multi-row upsert helper
async function upsert(table, rows, conflict, cols, update = cols.filter((c) => !conflict.includes(c)), returning = '') {
  const out = [];
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const params = [];
    const values = chunk.map((r) => `(${cols.map((c) => { params.push(r[c]); return `$${params.length}`; }).join(',')})`);
    const set = update.length ? `do update set ${update.map((c) => `${c} = excluded.${c}`).join(', ')}` : 'do nothing';
    const res = await db.query(
      `insert into public.${table} (${cols.join(',')}) values ${values.join(',')} on conflict (${conflict.join(',')}) ${set} ${returning}`,
      params,
    );
    out.push(...res.rows);
  }
  return out;
}

await db.query('begin');
try {
  await upsert('bands', bandRows, ['id'], Object.keys(bandRows[0]));
  await upsert('venues', venueRows, ['slug'], Object.keys(venueRows[0]));
  const showCols = ['band_id', 'label', 'kind', 'show_date', 'venue_slug', 'venue_raw', 'disc', 'image_url'];
  const ids = await upsert('shows', showRows, ['band_id', 'label'], showCols, undefined, 'returning id, band_id, label');
  const showId = new Map(ids.map((r) => [`${r.band_id}|${r.label}`, r.id]));
  const trackRows = showRows.flatMap((sh) => sh.songs.map((s) => ({
    legacy_id: String(s._id), show_id: showId.get(`${sh.band_id}|${sh.label}`), band_id: sh.band_id,
    title: str(s.title) ?? 'Untitled', position: Number.isFinite(Number(s.trackNumber)) ? Number(s.trackNumber) || null : null,
    duration: Math.round(Number(s.duration) || 0), audio_url: s.url, image_url: str(s.imageUrl),
    streams: Number(s.streams) || 0, source: str(s.source),
    created_at: s.lastModified ? new Date(s.lastModified) : new Date(),
  })));
  // streams: keep whichever is higher so a rerun never loses plays counted in Supabase
  await upsert('tracks', trackRows, ['audio_url'], Object.keys(trackRows[0]),
    ['legacy_id', 'show_id', 'band_id', 'title', 'position', 'duration', 'image_url', 'source']);
  await db.query(`update public.tracks t set streams = greatest(t.streams, m.streams)
    from (select unnest($1::text[]) url, unnest($2::int[]) streams) m where t.audio_url = m.url`,
  [trackRows.map((t) => t.audio_url), trackRows.map((t) => t.streams)]);
  await db.query('commit');
} catch (e) {
  await db.query('rollback');
  throw e;
}

const counts = await db.query(`select (select count(*) from public.bands) bands, (select count(*) from public.venues) venues,
  (select count(*) from public.shows) shows, (select count(*) from public.tracks) tracks`);
console.log('supabase now has', counts.rows[0]);
await db.end();
