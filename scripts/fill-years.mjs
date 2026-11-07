#!/usr/bin/env node
/**
 * Suggest a `year` for songs that have neither `year` nor `date`.
 *
 * Sources, in order of trust:
 *   1. tag     - the MP3's own ID3 year (reads the first 256 KB of the file)
 *   2. album   - a year in the album name ("TOB 2011 STUDIO CD", "09 Summer Grind", "Nexx Level Band '07")
 *   3. sibling - the most common year among other songs on the same band + album
 *
 * Song titles are never used: bands (TCB especially) put years in song names that aren't when the
 * song was made, and a leading "07" is usually a track number. Album names can run ahead too
 * ("2010 TAKE OVER" is tagged 2009), so a tag wins and a disagreement is noted for review.
 *
 * Compilations (greatest hits, best of, Crank Muzik) and loose buckets (Singles, Unknown) are skipped for
 * tag and sibling years: their tag is the compilation's release year, and a bucket mixes years.
 * Those rows come out blank with a note, for research.
 *
 * Dry run by default: writes a CSV of suggestions and changes nothing.
 *   node --env-file=.env.local scripts/fill-years.mjs [--out years.csv]
 *   node --env-file=.env.local scripts/fill-years.mjs --apply years.csv   # writes year + yearSource from a reviewed CSV
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { MongoClient, ObjectId } from 'mongodb';
import { parseBuffer } from 'music-metadata';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};
const THIS_YEAR = new Date().getFullYear();
const plausible = (y) => y >= 1970 && y <= THIS_YEAR;

/** A 4-digit year in free text. */
function year4(text) {
  const four = String(text ?? '').match(/(?:^|[^\d])((?:19[7-9]|20[0-4])\d)(?!\d)/);
  return four && plausible(Number(four[1])) ? Number(four[1]) : null;
}

/** A 2-digit year in an album name: leading "07 It's Our Turn" or trailing "'07". */
function year2(text) {
  const s = String(text ?? '');
  const two = s.match(/^\s*["'“‘]?'?(\d{2})(?=[\s'"”’])/) || s.match(/'(\d{2})\s*$/);
  if (two) {
    const n = Number(two[1]);
    const y = n + (n <= THIS_YEAR % 100 ? 2000 : 1900);
    if (plausible(y)) return y;
  }
  return null;
}

const COMPILATION = /greatest hits|best of|crank muzik|compilation|for the gogo heads|dance classics/i;
const BUCKET = /^\s*(singles|<unknown>|unknown album|no album|studio)\s*$/i;

const hasYear = (s) => /^\d{4}/.test(String(s.date ?? '')) || /^\d{4}$/.test(String(s.year ?? ''));

async function tagYear(url) {
  try {
    const res = await fetch(encodeURI(decodeURI(url)), { headers: { Range: 'bytes=0-262143' } });
    if (!res.ok && res.status !== 206) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const meta = await parseBuffer(buf, { mimeType: 'audio/mpeg' }, { duration: false, skipCovers: true });
    const y = meta.common.year ?? year4(meta.common.date);
    return y && plausible(y) ? y : null;
  } catch {
    return null;
  }
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

async function suggest(db, out) {
  const songs = await db
    .collection('music')
    .find({ hidden: { $ne: true } }, { projection: { artist: 1, album: 1, title: 1, url: 1, date: 1, year: 1 } })
    .toArray();
  const missing = songs.filter((s) => !hasYear(s));
  console.log(`${missing.length} of ${songs.length} songs have no year; reading tags...`);

  const found = new Map(); // _id -> { year, source }
  const notes = new Map(); // _id -> why it was left blank
  let done = 0;
  const queue = [...missing];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let s = queue.shift(); s; s = queue.shift()) {
        const loose = COMPILATION.test(s.album) || BUCKET.test(s.album);
        const named = year4(s.album) ?? year2(s.album);
        const tag = s.url ? await tagYear(s.url) : null;
        let pick = null;
        if (tag && !loose) pick = { year: tag, source: 'tag' };
        else if (tag) notes.set(String(s._id), `compilation/bucket tag says ${tag}`);
        if (pick && named && named !== pick.year) notes.set(String(s._id), `album name says ${named}`);
        pick ??= named ? { year: named, source: 'album' } : null;
        if (pick) found.set(String(s._id), pick);
        if (++done % 100 === 0) console.log(`  ${done}/${missing.length}`);
      }
    }),
  );

  // Siblings: the most common known year on the same band + album.
  const albumYears = new Map();
  for (const s of songs) {
    const y = hasYear(s) ? Number(String(s.year || s.date).slice(0, 4)) : found.get(String(s._id))?.year;
    if (!y) continue;
    const k = `${s.artist}|${s.album}`;
    const counts = albumYears.get(k) ?? new Map();
    counts.set(y, (counts.get(y) ?? 0) + 1);
    albumYears.set(k, counts);
  }
  for (const s of missing) {
    if (found.has(String(s._id)) || COMPILATION.test(s.album) || BUCKET.test(s.album)) continue;
    const counts = albumYears.get(`${s.artist}|${s.album}`);
    if (!counts) continue;
    const [y] = [...counts].sort((a, b) => b[1] - a[1])[0];
    found.set(String(s._id), { year: y, source: 'sibling' });
  }

  const lines = [['id', 'artist', 'album', 'title', 'year', 'source', 'note'].join(',')];
  for (const s of missing) {
    const f = found.get(String(s._id));
    lines.push([s._id, s.artist, s.album, s.title, f?.year ?? '', f?.source ?? '', notes.get(String(s._id)) ?? ''].map(csvCell).join(','));
  }
  writeFileSync(out, lines.join('\n') + '\n');
  const bySource = {};
  for (const f of found.values()) bySource[f.source] = (bySource[f.source] ?? 0) + 1;
  console.log(`suggested ${found.size}/${missing.length}`, bySource, `-> ${out}`);
}

async function apply(db, file) {
  const rows = parseCsv(readFileSync(file, 'utf8')).filter((r) => /^\d{4}$/.test(r.year));
  const ops = rows.map((r) => ({
    updateOne: {
      // Never overwrite a real year that appeared since the CSV was made; junk like a track number (3, "17") is fair game.
      filter: {
        _id: new ObjectId(r.id),
        $or: [{ year: { $exists: false } }, { year: null }, { year: { $lt: 1900 } }, { year: { $type: 'string', $not: /^\d{4}$/ } }],
      },
      update: { $set: { year: r.year, yearSource: r.source || 'manual' } },
    },
  }));
  if (!ops.length) return console.log('nothing to apply');
  const res = await db.collection('music').bulkWrite(ops, { ordered: false });
  console.log(`updated ${res.modifiedCount} of ${rows.length} rows`);
}

const client = await MongoClient.connect(process.env.MONGODB_URI);
try {
  const db = client.db();
  const applyFile = flag('--apply');
  if (applyFile) await apply(db, applyFile);
  else await suggest(db, flag('--out') || 'years.csv');
} finally {
  await client.close();
}
