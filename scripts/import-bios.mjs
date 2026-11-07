#!/usr/bin/env node
/**
 * Load researched band write-ups (bio, founded, members, sources) into the Mongo `bands` collection.
 *
 * Input: one or more JSON files, each an array of
 *   { id, dbName, fullName, founded, bio, members: [{name, role, years}], sources: [{title, url}], confidence, notes }
 * Only entries with confidence "high" or "medium" and a bio or members are written. Existing non-empty
 * fields are kept unless --overwrite is passed, so hand edits made in the DB survive a re-run.
 *
 * Dry run by default (prints what would change):
 *   node --env-file=.env.local scripts/import-bios.mjs bios-a.json bios-b.json
 *   node --env-file=.env.local scripts/import-bios.mjs --apply bios-*.json
 */
import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const overwrite = args.includes('--overwrite');
const files = args.filter((a) => !a.startsWith('--'));
if (!files.length) {
  console.error('usage: import-bios.mjs [--apply] [--overwrite] file.json...');
  process.exit(1);
}

const entries = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')));
const usable = entries.filter(
  (e) => ['high', 'medium'].includes(e.confidence) && (e.bio || e.members?.length),
);
console.log(`${usable.length} of ${entries.length} entries are high/medium with content`);

const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

const client = await MongoClient.connect(process.env.MONGODB_URI);
try {
  const bands = client.db().collection('bands');
  for (const e of usable) {
    const doc = await bands.findOne({ id: e.id });
    if (!doc) {
      console.log(`  ! no band with id ${e.id} (${e.dbName})`);
      continue;
    }
    const next = {
      bio: e.bio ?? undefined,
      founded: e.founded ?? undefined,
      members: e.members?.length ? e.members : undefined,
      sources: e.sources?.length ? e.sources : undefined,
    };
    const set = {};
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined) continue;
      if (!overwrite && !empty(doc[k])) continue;
      set[k] = v;
    }
    if (!Object.keys(set).length) continue;
    console.log(`  ${e.id} ${doc.name}: ${Object.keys(set).join(', ')}${set.members ? ` (${set.members.length} members)` : ''}`);
    if (apply) await bands.updateOne({ id: e.id }, { $set: { ...set, bioUpdatedAt: new Date() } });
  }
  console.log(apply ? 'applied' : 'dry run: pass --apply to write');
} finally {
  await client.close();
}
