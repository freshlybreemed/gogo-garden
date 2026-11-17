#!/usr/bin/env node
/**
 * List a WordPress site's media library via the public REST API — the "see the uploads folder"
 * that WordPress actually exposes. Read-only; downloads nothing.
 *
 *   node scripts/wp-media.mjs https://papalace.com            # audio only, summary
 *   node scripts/wp-media.mjs https://papalace.com --all      # every media type
 *   node scripts/wp-media.mjs https://papalace.com --json out.json   # dump full list
 */
import { writeFileSync } from 'node:fs';

const base = process.argv[2]?.replace(/\/$/, '');
if (!base) {
  console.error('usage: node scripts/wp-media.mjs <https://site> [--all] [--json <file>]');
  process.exit(1);
}
const all = process.argv.includes('--all');
const jsonIdx = process.argv.indexOf('--json');
const jsonOut = jsonIdx >= 0 ? process.argv[jsonIdx + 1] : null;

const fmt = (n) => (!n ? '?' : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);

async function fetchPage(page) {
  const url = `${base}/wp-json/wp/v2/media?per_page=100&page=${page}${all ? '' : '&media_type=file'}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'GoGoGarden-archive' } });
  if (res.status === 400) return { items: [], total: 0 }; // past the last page
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${url}`);
  return { items: await res.json(), total: Number(res.headers.get('x-wp-totalpages') || 1) };
}

const items = [];
let page = 1;
let totalPages = 1;
do {
  const { items: got, total } = await fetchPage(page);
  totalPages = total;
  items.push(...got);
  if (!got.length) break;
  page += 1;
} while (page <= totalPages);

// Keep audio unless --all.
const media = items
  .map((m) => ({
    id: m.id,
    title: (m.title?.rendered ?? '').trim(),
    url: m.source_url,
    mime: m.mime_type,
    size: m.media_details?.filesize ?? 0,
    date: m.date?.slice(0, 10),
    post: m.post, // the product/post it's attached to
  }))
  .filter((m) => (all ? true : /^audio\//.test(m.mime) || /\.(mp3|m4a|wav|aac)$/i.test(m.url)));

const bytes = media.reduce((n, m) => n + (m.size || 0), 0);
const byMime = new Map();
for (const m of media) byMime.set(m.mime, (byMime.get(m.mime) ?? 0) + 1);

console.log(`${base} — ${media.length} ${all ? 'media' : 'audio'} files, ~${fmt(bytes)} (REST reported ${totalPages} page(s))`);
for (const [mime, n] of [...byMime].sort((a, b) => b[1] - a[1])) console.log(`  ${mime.padEnd(16)} ${n}`);

// Group audio by the folder it's uploaded in (…/uploads/YYYY/MM/) to eyeball the shape.
const folders = new Map();
for (const m of media) {
  const f = (m.url.match(/\/uploads\/(\d{4}\/\d{2})\//) ?? [, 'other'])[1];
  folders.set(f, (folders.get(f) ?? 0) + 1);
}
console.log('\nby upload month:');
for (const [f, n] of [...folders].sort()) console.log(`  ${f}  ${n}`);

console.log('\nfirst 25 files:');
for (const m of media.slice(0, 25)) console.log(`  ${fmt(m.size).padStart(8)}  ${decodeURIComponent(m.url.split('/').pop())}`);

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(media, null, 2));
  console.log(`\nwrote ${media.length} entries to ${jsonOut}`);
}
