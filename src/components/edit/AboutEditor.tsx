'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveBandAbout } from '@/app/edit/actions';
import type { BandMember } from '@/lib/types';

const blank = (): BandMember => ({ name: '', role: null, years: null, social: null });
const input = 'w-full border border-rule bg-transparent px-2.5 py-1.5 text-[15px] text-paper focus:border-paper focus:outline-none';

/** Edit a band's bio, start year and members. Every change is logged. */
export function AboutEditor({
  bandId,
  bandName,
  bio,
  founded,
  members,
  signedIn,
}: {
  bandId: string;
  bandName: string;
  bio: string | null;
  founded: string | null;
  members: BandMember[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bio: bio ?? '', founded: founded ?? '', members: members.length ? members : [blank()] });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const empty = !bio && !members.length;
  const href = `/bands/${encodeURIComponent(bandId)}`;

  if (!signedIn) {
    return (
      <p className="mt-3 text-[13px] text-dust">
        {empty ? `Know ${bandName}? ` : 'Know someone missing? '}
        <Link href={`/login?next=${encodeURIComponent(href)}`} className="font-semibold text-paper underline underline-offset-4">
          Log in to add members and history
        </Link>
        .
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 border border-rule px-3 py-1.5 text-[13px] font-semibold text-paper hover:bg-tape">
        {empty ? `Add ${bandName}’s members and history` : 'Edit members and history'}
      </button>
    );
  }

  const setMember = (i: number, patch: Partial<BandMember>) =>
    setForm((f) => ({ ...f, members: f.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  return (
    <form
      className="mt-5 max-w-[46rem] border border-rule p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await saveBandAbout(bandId, { ...form, members: form.members.filter((m) => m.name.trim()) });
          if (res.ok) {
            setMsg({ ok: true, text: res.changed ? 'Saved. Thanks!' : 'Nothing changed.' });
            if (res.changed) setOpen(false);
          } else setMsg({ ok: false, text: res.error });
        });
      }}
    >
      <h3 className="font-display text-[18px] font-extrabold uppercase">{bandName}: members and history</h3>
      <p className="mt-1 text-[13px] text-dust">Changes go live right away and are logged, so mistakes can be undone.</p>

      <label className="mt-4 block text-[13px] font-semibold text-dust">
        Bio
        <textarea value={form.bio} maxLength={3000} rows={5} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className={`${input} mt-1`} />
      </label>
      <label className="mt-3 block max-w-[16rem] text-[13px] font-semibold text-dust">
        Started (year)
        <input value={form.founded} maxLength={40} onChange={(e) => setForm((f) => ({ ...f, founded: e.target.value }))} className={`${input} mt-1`} />
      </label>

      <fieldset className="mt-4">
        <legend className="text-[13px] font-semibold text-dust">Members</legend>
        <div className="mt-1 space-y-2">
          {form.members.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,.7fr)_minmax(0,1fr)_auto]">
              <input placeholder="Name" aria-label="Member name" value={m.name} maxLength={80} onChange={(e) => setMember(i, { name: e.target.value })} className={input} />
              <input placeholder="Role (lead talker, keys…)" aria-label="Role" value={m.role ?? ''} maxLength={60} onChange={(e) => setMember(i, { role: e.target.value || null })} className={input} />
              <input placeholder="Years" aria-label="Years" value={m.years ?? ''} maxLength={40} onChange={(e) => setMember(i, { years: e.target.value || null })} className={input} />
              <input placeholder="@instagram or link" aria-label="Social" value={m.social ?? ''} maxLength={200} onChange={(e) => setMember(i, { social: e.target.value || null })} className={input} />
              <button
                type="button"
                aria-label={`Remove ${m.name || 'member'}`}
                onClick={() => setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }))}
                className="px-2 text-dust hover:text-paper"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setForm((f) => ({ ...f, members: [...f.members, blank()] }))} className="mt-2 text-[13px] font-semibold text-paper underline underline-offset-4">
          + Add member
        </button>
      </fieldset>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={pending} className="bg-paper px-4 py-2 text-[14px] font-semibold text-ink disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-dust hover:text-paper">
          Cancel
        </button>
        {msg ? <span className={msg.ok ? 'text-[13px] text-leaf-light' : 'text-[13px] text-[#f08a7a]'}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
