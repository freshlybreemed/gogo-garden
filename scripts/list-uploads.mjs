#!/usr/bin/env node
/**
 * List what's in the Supabase `uploads` bucket: a folder tree, file counts and total size,
 * and a check for avatars/covers no profile or upload still points at.
 *
 *   node --env-file=.env.local scripts/list-uploads.mjs          # summary
 *   node --env-file=.env.local scripts/list-uploads.mjs --tree   # full file list
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (run with --env-file=.env.local)');
  process.exit(1);
}
const showTree = process.argv.includes('--tree');
const sb = createClient(url, key, { auth: { persistSession: false } });

const fmt = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Walk the bucket breadth-first; Storage.list is one folder level at a time. */
async function walk(prefix = '') {
  const files = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from('uploads').list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!data.length) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...(await walk(path))); // a folder
      else files.push({ path, size: entry.metadata?.size ?? 0, type: entry.metadata?.mimetype ?? '', at: entry.created_at });
    }
    if (data.length < 100) break;
    offset += 100;
  }
  return files;
}

const files = await walk();
const totalBytes = files.reduce((n, f) => n + f.size, 0);

// Per top-level folder (each is a user id).
const byUser = new Map();
for (const f of files) {
  const user = f.path.split('/')[0];
  const u = byUser.get(user) ?? { files: 0, bytes: 0 };
  u.files += 1;
  u.bytes += f.size;
  byUser.set(user, u);
}

console.log(`uploads bucket: ${files.length} files, ${fmt(totalBytes)} across ${byUser.size} user folders\n`);
for (const [user, u] of [...byUser].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${user}  ${String(u.files).padStart(4)} files  ${fmt(u.bytes).padStart(10)}`);
}

// Orphan check: avatars the profiles table no longer points at.
try {
  const { data: profiles } = await sb.from('profiles').select('avatar_url');
  const live = new Set((profiles ?? []).map((p) => p.avatar_url).filter(Boolean));
  const orphanAvatars = files.filter((f) => f.path.includes('/avatar/') && !live.has(sb.storage.from('uploads').getPublicUrl(f.path).data.publicUrl));
  if (orphanAvatars.length) {
    console.log(`\n${orphanAvatars.length} avatar file(s) no profile points at (${fmt(orphanAvatars.reduce((n, f) => n + f.size, 0))}):`);
    for (const f of orphanAvatars) console.log('  ', f.path);
  }
} catch (err) {
  console.error('\n(skipped avatar orphan check:', err.message, ')');
}

if (showTree) {
  console.log('\n--- all files ---');
  for (const f of files) console.log(`${fmt(f.size).padStart(10)}  ${f.path}`);
}
