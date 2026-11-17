#!/usr/bin/env node
/**
 * Build a search index of PA Palace Music (papalace.com), a go-go PA-tape store, from its public
 * WordPress/WooCommerce REST API. Writes src/data/papalace.json: one entry per tape (product),
 * with band / date / venue parsed from the slug and its public MP3 track URLs.
 *
 * Read-only against papalace.com; it re-hosts nothing (the garden streams the public URLs and
 * links each tape back to its PA Palace product page).
 *
 *   node scripts/fetch-papalace.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://papalace.com';
const UA = 'GoGoGarden-archive';
const OUT = 'src/data/papalace.json';

async function pageThrough(path, extra = '') {
  const out = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${BASE}${path}?per_page=100&page=${page}${extra}`, { headers: { 'User-Agent': UA } });
    if (res.status === 400) break; // past last page
    if (!res.ok) throw new Error(`${res.status} on ${path} page ${page}`);
    const batch = await res.json();
    if (!batch.length) break;
    out.push(...batch);
    const total = Number(res.headers.get('x-wp-totalpages') || 1);
    process.stdout.write(`\r  ${path}: ${out.length} (page ${page}/${total})   `);
    if (page >= total) break;
  }
  process.stdout.write('\n');
  return out;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const MONTH_NAMES = new Set([
  ...Object.keys(MONTHS),
  'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
]);

/** A word is a month only if it IS one ("aug"/"august") — not merely starts like one ("junkyard"). */
function monthOf(word) {
  if (/^\d{1,2}$/.test(word)) return Number(word);
  const w = word.toLowerCase();
  return MONTH_NAMES.has(w) ? MONTHS[w.slice(0, 3)] : NaN;
}

/** Pull band / date / venue out of a product slug like "junkyard-8-7-10-capitol-skyline-hotel". */
function parseSlug(slug) {
  const words = slug.split('-');
  // Find a date: either "8-7-10" (3 numeric words) or "aug-7-10". Skip i=0 so a band that is just
  // a date can't swallow its own name; require a real day and a 2-or-4-digit year.
  for (let i = 1; i < words.length; i++) {
    const mNum = monthOf(words[i]);
    const d = Number(words[i + 1]);
    const y = Number(words[i + 2]);
    if (mNum >= 1 && mNum <= 12 && d >= 1 && d <= 31 && (words[i + 2]?.length === 2 || words[i + 2]?.length === 4) && y >= 0 && y <= 2030) {
      const year = y < 100 ? (y > 40 ? 1900 + y : 2000 + y) : y;
      const iso = `${year}-${String(mNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const band = words.slice(0, i).join(' ');
      const venue = words.slice(i + 3).join(' ');
      return { band, date: iso, venue };
    }
  }
  return { band: slug.replace(/-/g, ' '), date: null, venue: '' };
}

const entities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
const title = (t) => entities(t?.rendered ?? '').replace(/\s+/g, ' ').trim();
const tc = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

console.log('fetching PA Palace catalog…');
const [products, media] = await Promise.all([pageThrough('/wp-json/wp/v2/product'), pageThrough('/wp-json/wp/v2/media')]);

// Audio, grouped by the product it hangs off.
const audioByPost = new Map();
for (const m of media) {
  const url = m.source_url || m.guid?.rendered;
  if (!url || !/\.(mp3|m4a|wav|aac)$/i.test(url)) continue;
  const list = audioByPost.get(m.post) ?? [];
  list.push({ id: m.id, title: title(m.title) || decodeURIComponent(url.split('/').pop()), url, size: m.media_details?.filesize ?? 0, order: m.menu_order ?? 0 });
  audioByPost.set(m.post, list);
}

const tapes = [];
for (const p of products) {
  const tracks = (audioByPost.get(p.id) ?? []).sort((a, b) => a.order - b.order || a.title.localeCompare(a.title, undefined, { numeric: true }));
  if (!tracks.length) continue; // no playable audio
  const info = parseSlug(p.slug);
  tapes.push({
    id: p.id,
    band: tc(info.band) || title(p.title),
    date: info.date,
    venue: info.venue ? tc(info.venue) : null,
    title: title(p.title),
    link: p.link,
    tracks: tracks.map((t, i) => ({
      // Strip a leading "01-" / "04 - " track number from the filename title.
      title: t.title.replace(/^\s*\d{1,2}\s*[-_.]\s*/, '').replace(/\.(mp3|m4a|wav|aac)$/i, '').replace(/-/g, ' ').trim() || `Track ${i + 1}`,
      url: t.url,
      size: t.size,
    })),
  });
}

tapes.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.band.localeCompare(b.band));
const trackCount = tapes.reduce((n, t) => n + t.tracks.length, 0);
mkdirSync('src/data', { recursive: true });
writeFileSync(OUT, JSON.stringify({ source: 'PA Palace Music', base: BASE, fetchedAt: new Date().toISOString(), tapes }, null, 2));
console.log(`\n${tapes.length} tapes, ${trackCount} tracks -> ${OUT}`);
console.log('newest:');
for (const t of tapes.slice(0, 8)) console.log(`  ${t.date ?? '????-??-??'}  ${t.band}${t.venue ? ' @ ' + t.venue : ''}  (${t.tracks.length})`);
