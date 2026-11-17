'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { revertEdit } from '@/app/edit/actions';
import type { BandMember } from '@/lib/types';

type Value = string | string[] | BandMember[] | null;
type Row = {
  id: string;
  at: string;
  userEmail: string;
  label: string;
  href: string | null;
  field: string;
  before: Value;
  after: Value;
  revertOf: string | null;
  revertedAt: string | null;
  revertedBy: string | null;
};

function show(v: Value) {
  if (v === null || v === '') return <span className="italic text-dust">empty</span>;
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
    const urls = v as string[];
    if (!urls.length) return <span className="italic text-dust">no photos</span>;
    return (
      <span className="flex flex-wrap gap-1.5">
        {urls.map((u) => (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary photo hosts
          <img key={u} src={u} alt="" className="h-12 w-12 object-cover" referrerPolicy="no-referrer" />
        ))}
      </span>
    );
  }
  if (Array.isArray(v)) {
    const members = v as BandMember[];
    if (!members.length) return <span className="italic text-dust">no members</span>;
    return (
      <ul className="space-y-0.5">
        {members.map((m, i) => (
          <li key={i}>
            {m.name}
            <span className="text-dust">{[m.role, m.years, m.social].filter(Boolean).length ? ` — ${[m.role, m.years, m.social].filter(Boolean).join(', ')}` : ''}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <span className="whitespace-pre-line">{v.length > 400 ? `${v.slice(0, 400)}…` : v}</span>;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function EditLog({ rows }: { rows: Row[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!rows.length) return <p className="mt-8 text-[15px] text-dust">No edits yet.</p>;

  return (
    <div className="mt-6">
      {err ? <p className="mb-3 text-[14px] text-[#f08a7a]">{err}</p> : null}
      <ol className="divide-y divide-rule border-y border-rule">
        {rows.map((r) => (
          <li key={r.id} className={`grid gap-3 py-4 md:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)_7rem] ${r.revertedAt ? 'opacity-55' : ''}`}>
            <div className="text-[13px]">
              <div className="text-paper">{when(r.at)}</div>
              <div className="truncate text-dust">{r.userEmail || 'unknown'}</div>
              <div className="mt-1 font-display text-[14px] font-extrabold uppercase text-leaf-light">
                {r.revertOf ? 'Revert · ' : ''}
                {r.field}
              </div>
            </div>
            <div className="min-w-0 text-[14px]">
              <div className="mb-1 truncate font-semibold text-paper">
                {r.href ? (
                  <Link href={r.href} className="underline-offset-4 hover:underline">
                    {r.label}
                  </Link>
                ) : (
                  r.label
                )}
              </div>
              <div className="text-[12px] tracking-wide text-dust uppercase">Before</div>
              <div className="text-paper/80">{show(r.before)}</div>
            </div>
            <div className="min-w-0 text-[14px] md:pt-6">
              <div className="text-[12px] tracking-wide text-dust uppercase">After</div>
              <div className="text-paper">{show(r.after)}</div>
            </div>
            <div className="text-right">
              {r.revertedAt ? (
                <span className="text-[12px] text-dust">
                  Reverted {when(r.revertedAt)}
                  {r.revertedBy ? ` by ${r.revertedBy}` : ''}
                </span>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setErr(null);
                    setBusy(r.id);
                    start(async () => {
                      const res = await revertEdit(r.id, r.href);
                      if (!res.ok) setErr(res.error);
                      setBusy(null);
                    });
                  }}
                  className="border border-rule px-3 py-1.5 text-[13px] font-semibold text-paper hover:bg-tape disabled:opacity-50"
                >
                  {busy === r.id ? 'Reverting…' : 'Revert'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
