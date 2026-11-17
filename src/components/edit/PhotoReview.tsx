'use client';

import { useState, useTransition } from 'react';
import { decidePhoto } from '@/app/admin/photos/actions';

type Cand = { id: string; imageUrl: string; sourceUrl: string; sourceType: string; caption: string; why: string; confidence: string; status: string };
type Group = { bandId: string; bandName: string; currentPhotos: string[]; cands: Cand[] };

export function PhotoReview({ groups }: { groups: Group[] }) {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  const act = (c: Cand, d: 'approve' | 'main' | 'skip') => {
    setStatus((s) => ({ ...s, [c.id]: d === 'skip' ? 'skipping' : 'saving' }));
    setErr((e) => ({ ...e, [c.id]: '' }));
    start(async () => {
      const r = await decidePhoto(c.id, d);
      if (r.ok) setStatus((s) => ({ ...s, [c.id]: d === 'skip' ? 'skipped' : d === 'main' ? 'main' : 'approved' }));
      else {
        setStatus((s) => ({ ...s, [c.id]: 'pending' }));
        setErr((e) => ({ ...e, [c.id]: r.error }));
      }
    });
  };

  return (
    <div className="mt-6 space-y-10">
      {groups.map((g) => (
        <section key={g.bandId} aria-labelledby={`b-${g.bandId}`}>
          <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-paper pb-1.5">
            <h2 id={`b-${g.bandId}`} className="poster text-[32px]">
              <a href={`/bands/${encodeURIComponent(g.bandId)}`} className="hover:text-leaf-light">{g.bandName}</a>
            </h2>
            <span className="flex items-center gap-1.5 text-[12px] text-dust">
              Now: {g.currentPhotos.length ? null : 'no photo'}
              {g.currentPhotos.slice(0, 6).map((u) => (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary hosts
                <img key={u} src={u} alt="" referrerPolicy="no-referrer" className="h-8 w-8 object-cover" />
              ))}
            </span>
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.cands.map((c) => {
              const st = status[c.id] ?? c.status;
              const done = st === 'approved' || st === 'main' || st === 'skipped';
              return (
                <li key={c.id} className={`border border-rule ${st === 'skipped' ? 'opacity-40' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary hosts */}
                  <img src={c.imageUrl} alt={c.caption} referrerPolicy="no-referrer" loading="lazy" className="aspect-[4/3] w-full bg-tape object-cover" />
                  <div className="p-3 text-[13px]">
                    <p className="font-semibold text-paper">{c.caption}</p>
                    <p className="mt-1 text-dust">{c.why}</p>
                    <p className="mt-1 text-[12px] text-dust">
                      {c.sourceType} · {c.confidence} ·{' '}
                      <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-paper">source ↗</a>
                    </p>
                    {done ? (
                      <p className={`mt-3 font-semibold ${st === 'skipped' ? 'text-dust' : 'text-leaf-light'}`}>
                        {st === 'main' ? '✓ Main photo' : st === 'approved' ? '✓ Added' : 'Skipped'}
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={st === 'saving' || st === 'skipping'} onClick={() => act(c, 'approve')} className="bg-paper px-3 py-1.5 font-semibold text-ink disabled:opacity-50">
                          {st === 'saving' ? 'Saving…' : 'Approve'}
                        </button>
                        <button type="button" disabled={st === 'saving' || st === 'skipping'} onClick={() => act(c, 'main')} className="border border-rule px-3 py-1.5 font-semibold text-paper hover:bg-tape disabled:opacity-50">
                          Make main
                        </button>
                        <button type="button" disabled={st === 'saving' || st === 'skipping'} onClick={() => act(c, 'skip')} className="px-2 py-1.5 text-dust hover:text-paper disabled:opacity-50">
                          Skip
                        </button>
                      </div>
                    )}
                    {err[c.id] ? <p className="mt-2 text-[#f08a7a]">{err[c.id]}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
