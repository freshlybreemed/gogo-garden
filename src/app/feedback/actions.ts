'use server';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { alertOwner } from '@/lib/alert';
import { getDb } from '@/lib/db';
import { currentUser } from '@/lib/supabase/server';

export type FeedbackResult = { ok: true } | { ok: false; error: string };
const KINDS = ['idea', 'bug', 'music', 'other'] as const;
const DAILY = 10;

/** Store a note from a listener and ping the owner. Anyone can send one; spam is capped per IP. */
export async function sendFeedback(input: {
  kind: string;
  message: string;
  contact: string;
  page: string;
  /** Honeypot: humans never see this field. */
  website: string;
}): Promise<FeedbackResult> {
  if (input.website) return { ok: true }; // bot: pretend it worked
  const message = String(input.message ?? '').trim();
  if (message.length < 3) return { ok: false, error: 'Say a little more.' };
  if (message.length > 3000) return { ok: false, error: 'Keep it under 3,000 characters.' };
  const kind = (KINDS as readonly string[]).includes(input.kind) ? input.kind : 'other';
  const contact = String(input.contact ?? '').trim().slice(0, 200) || null;
  const page = /^\/[^\s]{0,300}$/.test(String(input.page ?? '')) ? input.page : null;

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update(`${ip}|gogo-feedback`).digest('hex').slice(0, 24);
  const user = await currentUser();

  const coll = (await getDb()).collection('feedback');
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  if ((await coll.countDocuments({ ipHash, at: { $gte: since } })) >= DAILY) {
    return { ok: false, error: 'Thanks — that’s a lot for one day. Try again tomorrow.' };
  }
  await coll.insertOne({
    at: new Date(),
    kind,
    message,
    contact,
    page,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    ipHash,
    userAgent: (h.get('user-agent') ?? '').slice(0, 200),
    status: 'new',
  });
  await alertOwner(`GoGo Garden feedback (${kind})`, [
    message.slice(0, 1500),
    contact || user?.email ? `From: ${contact ?? ''} ${user?.email ? `(${user.email})` : ''}`.trim() : 'From: anonymous',
    page ? `Page: ${page}` : '',
  ].filter(Boolean));
  return { ok: true };
}
