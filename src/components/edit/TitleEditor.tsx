'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveTrackTitles } from '@/app/edit/actions';

type Row = { id: string; position: number; title: string; placeholder: boolean };

/** "Fix titles" for one show: signed-in listeners can name untitled cuts. Every change is logged. */
export function TitleEditor({ showHref, tracks, signedIn }: { showHref: string; tracks: Row[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(tracks.map((t) => [t.id, t.title])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const untitled = tracks.filter((t) => t.placeholder).length;

  if (!signedIn) {
    return (
      <p className="mt-2 text-[13px] text-dust">
        Know the song names?{' '}
        <Link href={`/login?next=${encodeURIComponent(showHref)}`} className="font-semibold text-paper underline underline-offset-4">
          Log in to add titles
        </Link>
        .
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 border border-rule px-3 py-1.5 text-[13px] font-semibold text-paper hover:bg-tape"
      >
        {untitled ? `Add titles (${untitled} untitled)` : 'Edit titles'}
      </button>
    );
  }

  const changed = tracks.filter((t) => values[t.id].trim() && values[t.id].trim() !== t.title);

  return (
    <form
      className="mt-4 max-w-[40rem] border border-rule p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await saveTrackTitles(showHref, Object.fromEntries(changed.map((t) => [t.id, values[t.id]])));
          if (res.ok) {
            setMsg({ ok: true, text: res.changed ? `Saved ${res.changed} title${res.changed === 1 ? '' : 's'}. Thanks!` : 'Nothing changed.' });
            if (res.changed) setOpen(false);
          } else setMsg({ ok: false, text: res.error });
        });
      }}
    >
      <h3 className="font-display text-[18px] font-extrabold uppercase">Add or fix titles</h3>
      <p className="mt-1 text-[13px] text-dust">Changes go live right away and are logged, so mistakes can be undone.</p>
      <ol className="mt-3 space-y-2">
        {tracks.map((t) => (
          <li key={t.id} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2">
            <span className="text-right text-[13px] text-dust tnum">{t.position}</span>
            <input
              value={values[t.id]}
              maxLength={160}
              placeholder={t.placeholder ? `Untitled (part ${t.position})` : undefined}
              onChange={(e) => setValues((v) => ({ ...v, [t.id]: e.target.value }))}
              aria-label={`Title for track ${t.position}`}
              className="w-full border border-rule bg-transparent px-2.5 py-1.5 text-[15px] text-paper focus:border-paper focus:outline-none"
            />
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={pending || !changed.length} className="bg-paper px-4 py-2 text-[14px] font-semibold text-ink disabled:opacity-50">
          {pending ? 'Saving…' : `Save${changed.length ? ` ${changed.length}` : ''}`}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-dust hover:text-paper">
          Cancel
        </button>
        {msg ? <span className={msg.ok ? 'text-[13px] text-leaf-light' : 'text-[13px] text-[#f08a7a]'}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
