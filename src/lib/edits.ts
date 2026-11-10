import 'server-only';
import { ObjectId } from 'mongodb';
import type { User } from '@supabase/supabase-js';
import { getDb } from './db';
import type { BandMember } from './types';

/**
 * Community edits. Every change writes the catalog document and appends one row
 * per field to the `edits` collection with the value before and after, so any
 * change can be reverted from /admin/edits.
 */

export type EditEntity = 'track' | 'band';
export type EditField = 'title' | 'bio' | 'founded' | 'members';
type Value = string | BandMember[] | null;

export type EditRow = {
  id: string;
  at: string;
  userId: string;
  userEmail: string;
  entity: EditEntity;
  entityId: string;
  /** Human label at edit time ("Backyard Band", "BYB / 6-23-96 @ Mega, track 3"). */
  label: string;
  href: string | null;
  field: EditField;
  before: Value;
  after: Value;
  /** Set on a row that undid another row. */
  revertOf: string | null;
  /** Set on a row that has been undone. */
  revertedAt: string | null;
  revertedBy: string | null;
};

const DAILY_LIMIT = 300;
const FIELDS: Record<EditEntity, EditField[]> = { track: ['title'], band: ['bio', 'founded', 'members'] };

export class EditError extends Error {}

const clean = (s: unknown, max: number) => {
  const v = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (v.length > max) throw new EditError(`Keep it under ${max} characters.`);
  return v;
};

/** Normalise and validate a value for a field. Returns null for "empty". */
export function normalise(field: EditField, raw: unknown): Value {
  switch (field) {
    case 'title': {
      const v = clean(raw, 160);
      if (!v) throw new EditError('A title can’t be empty.');
      return v;
    }
    case 'bio': {
      const v = String(raw ?? '').trim();
      if (v.length > 3000) throw new EditError('Keep the bio under 3,000 characters.');
      return v || null;
    }
    case 'founded':
      return clean(raw, 40) || null;
    case 'members': {
      if (!Array.isArray(raw)) throw new EditError('Members must be a list.');
      if (raw.length > 60) throw new EditError('That’s a lot of members — 60 max.');
      return raw
        .map((m) => ({
          name: clean((m as BandMember)?.name, 80),
          role: clean((m as BandMember)?.role, 60) || null,
          years: clean((m as BandMember)?.years, 40) || null,
          social: social((m as BandMember)?.social),
        }))
        .filter((m) => m.name);
    }
  }
}

/** An Instagram @handle or an http(s) URL; anything else is rejected. */
function social(raw: unknown): string | null {
  const v = clean(raw, 200);
  if (!v) return null;
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(v)) return '@' + v.replace(/^@/, '');
  try {
    const u = new URL(v.startsWith('http') ? v : `https://${v}`);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
  } catch {}
  throw new EditError(`“${v}” isn’t a link or @handle.`);
}

const same = (a: Value, b: Value) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

async function target(entity: EditEntity, entityId: string) {
  const db = await getDb();
  if (entity === 'track') {
    if (!ObjectId.isValid(entityId)) throw new EditError('Unknown track.');
    const coll = db.collection('music');
    const filter = { _id: new ObjectId(entityId) };
    const doc = await coll.findOne(filter);
    if (!doc) throw new EditError('Unknown track.');
    return { coll, filter, doc };
  }
  const coll = db.collection('bands');
  const num = Number(entityId);
  const filter = Number.isFinite(num) ? { $or: [{ id: num }, { id: entityId }] } : { id: entityId };
  const doc = await coll.findOne(filter);
  if (!doc) throw new EditError('Unknown band.');
  return { coll, filter: { _id: doc._id }, doc };
}

function current(doc: Record<string, unknown>, field: EditField): Value {
  const v = doc[field];
  if (field === 'members') return normalise('members', Array.isArray(v) ? v : []);
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s || null;
}

async function checkRate(userId: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const n = await (await getDb()).collection('edits').countDocuments({ userId, at: { $gte: since } });
  if (n >= DAILY_LIMIT) throw new EditError('You’ve hit today’s edit limit. Try again tomorrow.');
}

/**
 * Apply changes to one entity. Only fields that actually change are written and logged.
 * Returns the number of fields changed.
 */
export async function applyEdits(
  user: Pick<User, 'id' | 'email'>,
  entity: EditEntity,
  entityId: string,
  changes: Partial<Record<EditField, unknown>>,
  meta: { label: string; href: string | null },
  opts: { revertOf?: string } = {},
): Promise<number> {
  if (!opts.revertOf) await checkRate(user.id);
  const { coll, filter, doc } = await target(entity, entityId);
  const db = await getDb();
  const set: Record<string, unknown> = {};
  const logs: Record<string, unknown>[] = [];
  const now = new Date();
  for (const [field, raw] of Object.entries(changes) as [EditField, unknown][]) {
    if (!FIELDS[entity].includes(field)) throw new EditError(`Can’t edit ${field} here.`);
    const after = opts.revertOf ? (raw as Value) : normalise(field, raw);
    const before = current(doc, field);
    if (same(before, after)) continue;
    set[field] = after;
    logs.push({
      at: now,
      userId: user.id,
      userEmail: user.email ?? '',
      entity,
      entityId,
      label: meta.label,
      href: meta.href,
      field,
      before,
      after,
      revertOf: opts.revertOf ?? null,
      revertedAt: null,
      revertedBy: null,
    });
  }
  if (!logs.length) return 0;
  // Log first: a logged change that failed to apply is harmless; an unlogged change isn't revertible.
  await db.collection('edits').insertMany(logs);
  await coll.updateOne(filter, { $set: { ...set, editedAt: now } });
  return logs.length;
}

/** Put a field back to its value before the given edit. Logged as its own edit. */
export async function revertEdit(admin: Pick<User, 'id' | 'email'>, editId: string) {
  if (!ObjectId.isValid(editId)) throw new EditError('Unknown edit.');
  const edits = (await getDb()).collection('edits');
  const row = await edits.findOne({ _id: new ObjectId(editId) });
  if (!row) throw new EditError('Unknown edit.');
  if (row.revertedAt) throw new EditError('Already reverted.');
  await applyEdits(
    admin,
    row.entity as EditEntity,
    String(row.entityId),
    { [row.field as EditField]: row.before ?? null },
    { label: String(row.label), href: (row.href as string | null) ?? null },
    { revertOf: editId },
  );
  await edits.updateOne({ _id: row._id }, { $set: { revertedAt: new Date(), revertedBy: admin.email ?? admin.id } });
}

export async function listEdits(limit = 300): Promise<EditRow[]> {
  const docs = await (await getDb()).collection('edits').find().sort({ at: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    at: new Date(d.at).toISOString(),
    userId: String(d.userId),
    userEmail: String(d.userEmail ?? ''),
    entity: d.entity,
    entityId: String(d.entityId),
    label: String(d.label ?? ''),
    href: (d.href as string | null) ?? null,
    field: d.field,
    before: (d.before as Value) ?? null,
    after: (d.after as Value) ?? null,
    revertOf: d.revertOf ? String(d.revertOf) : null,
    revertedAt: d.revertedAt ? new Date(d.revertedAt).toISOString() : null,
    revertedBy: (d.revertedBy as string | null) ?? null,
  }));
}
