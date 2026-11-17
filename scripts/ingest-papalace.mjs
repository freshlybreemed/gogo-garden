#!/usr/bin/env node
/**
 * Ingest PA Palace Music tapes (src/data/papalace.json) into the garden's own catalog (Mongo
 * `music` + `bands`) so they show up everywhere, in the right crates. Tracks stream from the
 * public PA Palace URLs (nothing re-hosted). Band photos are filled from PA Palace categories.
 *
 *   node --env-file=.env.local scripts/ingest-papalace.mjs           # DRY RUN (writes nothing)
 *   node --env-file=.env.local scripts/ingest-papalace.mjs --commit  # write to Mongo
 *   ... --replace-photos   # also overwrite a band's existing photo with PA Palace's
 *
 * Safe to re-run: a track whose URL is already in the garden is skipped.
 */
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const COMMIT = process.argv.includes('--commit');
const REPLACE_PHOTOS = process.argv.includes('--replace-photos');
const SOURCE = 'papalace-ingest-2026-11';
const UA = 'GoGoGarden-archive';
const BASE = 'https://papalace.com';

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Garden nicknames, so "Backyard Band" lands in the BYB crate (mirrors catalog.ts KNOWN_AS).
const KNOWN_AS = {
  BYB: ['Backyard Band', 'Backyard'], TOB: ['TakeOva Band', 'Take Over Band'], TCB: ['Total Control Band', 'TC Bounce'],
  'New Impressionz': ['NIB', 'New Impressions'], 'New Vision': ['NVB'], 'Nexx Level': ['NLB', 'Next Level'],
  'Tru Expressionz': ['TEB', 'True Expressions'], 'E.U.': ['EU', 'Experience Unlimited'], 'Rare Essence': ['RE'],
  'Junkyard Band': ['JYB', 'Junkyard'], NEG: ['Northeast Groovers'], '3DB': ['Third Dimension Band'],
  CCB: ['Critical Condition Band'], Reaction: ['Reaction Band'], Renegade: ['Renegade Band'],
  'Chuck Brown': ['Chuck Brown and the Soul Searchers', 'Soul Searchers'], MOB: ['M.O.B.', 'M.O.B'],
};

// Collapse PA Palace category variants into one band.
const PALACE_FIX = new Map([
  ['Lissen Band', 'Lissen'], ['Lissen 2.0', 'Lissen'], ['Lissen Da Grewp', 'Lissen'],
  ['Prophecy Band', 'Prophecy'], ['Faycez-U-Know', 'Faycez U Know'], ['Young Black Image (YBI)', 'Young Black Image'],
  ['Maiesha And HipHuggers', 'Maiesha and the Hip Huggers'], ['DaMixx', 'Da Mixx'], ['RE-Up Band', 'Re-Up Band'],
]);
// Not bands: DJ mixes and meta categories.
const DROP = (name) => /^dj pa\b/i.test(name) || /^main[/ ]/i.test(name) || /^(uncategorized|latest releases|other bands)$/i.test(name);

const fixBand = (name) => PALACE_FIX.get(name) ?? name;

// Category names that fetch-papalace.mjs expands to full band names.
const PHOTO_FULL_NAMES = new Map([['negroovers', 'Northeast Groovers'], ['backyardband', 'Backyard Band'], ['re', 'Rare Essence']]);

/** ISO "2010-08-07" -> "8-7-10", the way the garden writes tape dates. */
function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${m}-${d}-${String(y).slice(2)}`;
}

async function catalogPhotos() {
  const out = new Map();
  const cats = await (await fetch(`${BASE}/wp-json/wc/store/v1/products/categories?per_page=100`, { headers: { 'User-Agent': UA } })).json();
  for (const t of cats) {
    if (!t.image?.src) continue;
    out.set(norm(fixBand(t.name)), t.image.src);
    // papalace.json already uses full names ("NE Groovers" -> "Northeast Groovers"); match those too.
    const full = PHOTO_FULL_NAMES.get(norm(t.name));
    if (full) out.set(norm(full), t.image.src);
  }
  return out;
}

const data = JSON.parse(readFileSync('src/data/papalace.json', 'utf8'));
const photos = await catalogPhotos();

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db('music');
const bandDocs = await db.collection('bands').find().toArray();
const existingUrls = new Set((await db.collection('music').find({}, { projection: { url: 1 } }).toArray()).map((d) => d.url));

// Match index: every name a garden band answers to -> the band doc.
const gardenByName = new Map();
for (const b of bandDocs) {
  for (const n of [b.name, b.shortName, ...(KNOWN_AS[b.name] ?? [])]) if (n) gardenByName.set(norm(n), b);
}

// Only bands the garden already knows. Unknown PA Palace bands are skipped (no new bands created).
const resolved = new Map(); // palaceBand -> { id, name, doc, photo } | null
function resolveBand(rawName) {
  const name = fixBand(rawName);
  if (resolved.has(name)) return resolved.get(name);
  const existing = gardenByName.get(norm(name));
  const entry = existing ? { id: Number(existing.id), name: existing.name, doc: existing, photo: photos.get(norm(name)) ?? null } : null;
  resolved.set(name, entry);
  return entry;
}

const musicDocs = [];
let skipDup = 0;
const skippedTapes = [];
const now = new Date();
const unknownBands = new Set();
for (const tape of data.tapes) {
  if (DROP(tape.band)) {
    skippedTapes.push(tape.band);
    continue;
  }
  const band = resolveBand(tape.band);
  if (!band) {
    // A band the garden doesn't have yet — skip it (we only take what we know).
    unknownBands.add(fixBand(tape.band));
    continue;
  }
  const album = tape.date ? `${shortDate(tape.date)}${tape.venue ? ` @ ${tape.venue}` : ''}` : tape.title;
  tape.tracks.forEach((t, i) => {
    if (existingUrls.has(t.url)) {
      skipDup++;
      return;
    }
    existingUrls.add(t.url);
    const title = /^(track|tr|pt|part)?\s*\d+$/i.test(t.title.trim()) ? `Track ${i + 1}` : t.title;
    musicDocs.push({
      artist: band.name,
      artistId: String(band.id),
      url: t.url,
      title,
      album,
      trackNumber: i + 1,
      duration: 0,
      imageUrl: '',
      streams: 0,
      date: tape.date ?? '',
      year: tape.date ? tape.date.slice(0, 4) : '',
      venue: tape.venue ?? '',
      venueRaw: tape.venue ?? '',
      venueSlug: '',
      source: SOURCE,
      addedAt: now.toISOString(),
      lastModified: now,
    });
  });
}

// Band photo plan: an existing band gets the PA Palace photo as main only when it has none
// (or --replace-photos); otherwise the photo joins its pool.
const photoUpdates = [];
for (const entry of resolved.values()) {
  if (!entry || !entry.photo) continue;
  const hasImage = Boolean(entry.doc.image);
  if (!hasImage || REPLACE_PHOTOS) photoUpdates.push({ id: entry.id, name: entry.name, set: 'main', url: entry.photo });
  else if (!(entry.doc.photos ?? []).includes(entry.photo)) photoUpdates.push({ id: entry.id, name: entry.name, set: 'pool', url: entry.photo });
}

// ---- report ----
console.log(`PA Palace -> garden ingest  (${COMMIT ? 'COMMIT' : 'DRY RUN'})\n`);
const matchedBands = [...resolved.values()].filter(Boolean);
console.log(`tapes: ${data.tapes.length} | tracks to insert: ${musicDocs.length} | already in garden (skipped): ${skipDup}`);
console.log(`known bands taken: ${matchedBands.length}`);

console.log('\nTAKING (known bands):');
for (const b of matchedBands.sort((a, c) => a.name.localeCompare(c.name))) {
  const n = musicDocs.filter((m) => m.artistId === String(b.id)).length;
  if (n) console.log(`  ${b.name.padEnd(22)} +${n} tracks  ${b.photo ? 'photo✓' : ''}`);
}
console.log(`\nSKIPPED — unknown bands (${unknownBands.size}): ${[...unknownBands].sort().join(', ')}`);
if (skippedTapes.length) console.log(`SKIPPED — DJ PA / meta: ${[...new Set(skippedTapes)].join(', ')}`);
console.log('\nBand photos:');
for (const p of photoUpdates) console.log(`  ${p.set === 'main' ? 'SET MAIN ' : 'add pool '} ${p.name} (id ${p.id})`);
if (!photoUpdates.length) console.log('  (none — matched bands already have photos; use --replace-photos to override)');

if (!COMMIT) {
  console.log('\nDRY RUN — nothing written. Re-run with --commit to apply.');
  await client.close();
  process.exit(0);
}

// ---- write ----
for (const p of photoUpdates) {
  if (p.set === 'main') await db.collection('bands').updateOne({ id: p.id }, { $set: { image: p.url, editedAt: now }, $addToSet: { photos: p.url } });
  else await db.collection('bands').updateOne({ id: p.id }, { $addToSet: { photos: p.url } });
}
if (musicDocs.length) await db.collection('music').insertMany(musicDocs);
console.log(`\nWROTE: ${photoUpdates.length} photo updates, ${musicDocs.length} tracks across ${matchedBands.length} known bands.`);
console.log('Catalog refreshes within a minute. To mirror into Supabase (likes/plays), run the Mongo->Supabase sync next.');
await client.close();
