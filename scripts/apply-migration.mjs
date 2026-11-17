#!/usr/bin/env node
/**
 * Apply one SQL migration file to the Supabase database in a single transaction
 * (rolls back on any error). Uses SUPABASE_DB_URL from .env.local.
 *
 *   node --env-file=.env.local scripts/apply-migration.mjs supabase/migrations/<file>.sql
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
if (!file || !file.endsWith('.sql')) {
  console.error('usage: node --env-file=.env.local scripts/apply-migration.mjs <migration.sql>');
  process.exit(1);
}
if (!process.env.SUPABASE_DB_URL) {
  console.error('SUPABASE_DB_URL is not set (run with --env-file=.env.local)');
  process.exit(1);
}

const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
await db.connect();
try {
  await db.query('begin');
  await db.query(readFileSync(file, 'utf8'));
  await db.query('commit');
  console.log(`applied ${file}`);
} catch (err) {
  await db.query('rollback');
  console.error(`rolled back ${file}: ${err.message}`);
  process.exitCode = 1;
} finally {
  await db.end();
}
