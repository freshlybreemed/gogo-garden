#!/usr/bin/env node
/**
 * Fill in track lengths for PA Palace tracks (ingested with duration 0). Reads only the first
 * part of each MP3 (its tag and first frames) and works out the length from the bitrate and file size.
 *
 *   node --env-file=.env.local scripts/fill-papalace-durations.mjs [--dry]
 */
import { MongoClient } from 'mongodb';
import { parseBuffer } from 'music-metadata';

const DRY = process.argv.includes('--dry');
const c = await new MongoClient(process.env.MONGODB_URI).connect();
const music = c.db('music').collection('music');
const docs = await music.find({ source: 'papalace-ingest-2026-11', $or: [{ duration: 0 }, { duration: null }] }).toArray();
console.log(`${docs.length} tracks without a length`);

let done = 0, failed = 0;
/** Size of a leading ID3v2 tag (cover art can make it megabytes), 0 if none. */
function id3Size(b) {
  if (b.length < 10 || b.toString('latin1', 0, 3) !== 'ID3') return 0;
  return 10 + ((b[6] & 0x7f) << 21 | (b[7] & 0x7f) << 14 | (b[8] & 0x7f) << 7 | (b[9] & 0x7f));
}

async function fetchRange(url, end) {
  const res = await fetch(url, { headers: { Range: `bytes=0-${end}`, 'User-Agent': 'GoGoGarden-archive' } });
  const total = Number((res.headers.get('content-range') ?? '').split('/')[1]) || Number(res.headers.get('content-length'));
  return { buf: Buffer.from(await res.arrayBuffer()), total };
}

async function one(d) {
  const url = encodeURI(d.url);
  let { buf, total } = await fetchRange(url, 65535);
  const tag = id3Size(buf);
  // Need the tag plus some audio frames to read the bitrate.
  ({ buf } = await fetchRange(url, tag + 131071));
  const meta = await parseBuffer(buf, { mimeType: 'audio/mpeg', size: total }, { duration: false, skipCovers: true });
  const bitrate = meta.format.bitrate;
  if (!bitrate || !total) throw new Error('no bitrate');
  // Length = audio bytes / bytes per second (exact for CBR, close for VBR).
  const secs = Math.round(((total - tag) * 8) / bitrate);
  if (secs < 5 || secs > 4 * 3600) throw new Error(`implausible length ${secs}s`);
  if (!DRY) await music.updateOne({ _id: d._id }, { $set: { duration: secs } });
  done++;
  return secs;
}
const queue = [...docs];
const samples = [];
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let d; (d = queue.shift()); ) {
    try { const s = await one(d); if (samples.length < 6) samples.push(`${d.title}: ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); }
    catch (e) { failed++; console.log('  failed', d.title, '-', e.message); }
  }
}));
console.log(`${DRY ? 'would set' : 'set'} ${done}, failed ${failed}`);
console.log('samples:', samples.join(' | '));
await c.close();
