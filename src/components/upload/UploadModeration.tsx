'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { deleteUpload, setUploadHidden } from '@/app/admin/uploads/actions';

type Row = {
  id: string; title: string; kind: string; when: string | null; venue: string | null; status: string;
  newBand: string | null; createdAt: string; bandId: number | null; bandName: string; uploader: string;
  tracks: { title: string; url: string; duration: number }[];
};

export function UploadModeration({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); setConfirm(null); router.refresh(); });

  if (!rows.length) return <p className="mt-8 text-[15px] text-paper/85">Nothing uploaded yet.</p>;
  return (
    <ul className={clsx('mt-8 border-t border-rule', pending && 'opacity-60')}>
      {rows.map((u) => (
        <li key={u.id} className="border-b border-rule py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[17px] font-semibold">
              {u.bandId ? <Link href={`/bands/${u.bandId}`} className="hover:underline">{u.bandName}</Link> : u.bandName}
              <span className="text-dust"> · </span>{u.title}
              {u.status === 'hidden' ? <span className="ml-2 border border-crank px-1.5 text-[12px] font-bold text-crank">HIDDEN</span> : null}
              {u.newBand ? <span className="ml-2 border border-leaf px-1.5 text-[12px] font-bold text-leaf-light">NEW BAND</span> : null}
            </p>
            <span className="flex gap-4 text-[14px] font-semibold text-dust">
              <button type="button" disabled={pending} onClick={() => run(() => setUploadHidden(u.id, u.status !== 'hidden'))} className="hover:text-paper">
                {u.status === 'hidden' ? 'Restore' : 'Hide'}
              </button>
              {confirm === u.id ? (
                <span className="flex gap-3">
                  <button type="button" disabled={pending} onClick={() => run(() => deleteUpload(u.id))} className="text-crank">Delete for good</button>
                  <button type="button" onClick={() => setConfirm(null)} className="hover:text-paper">Keep</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(u.id)} className="hover:text-crank">Delete</button>
              )}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-dust">
            {u.kind}{u.when ? ` · ${u.when}` : ''}{u.venue ? ` · ${u.venue}` : ''} · {u.tracks.length} tracks · by {u.uploader} · {new Date(u.createdAt).toLocaleString()}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-[13px] font-semibold text-dust hover:text-paper">Listen</summary>
            <ol className="mt-2 space-y-2">
              {u.tracks.map((t, i) => (
                <li key={t.url} className="flex flex-wrap items-center gap-3 text-[14px]">
                  <span className="w-6 text-right text-dust tnum">{i + 1}</span>
                  <span className="min-w-40 truncate">{t.title}</span>
                  <audio controls preload="none" src={t.url} className="h-8 max-w-full" />
                </li>
              ))}
            </ol>
          </details>
        </li>
      ))}
    </ul>
  );
}
