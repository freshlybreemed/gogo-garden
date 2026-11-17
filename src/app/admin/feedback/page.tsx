import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/admin';
import { getDb } from '@/lib/db';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Feedback (admin)' };
export const dynamic = 'force-dynamic';

const when = (d: Date) => d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function AdminFeedbackPage() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  const rows = await (await getDb()).collection('feedback').find().sort({ at: -1 }).limit(300).toArray();

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(56px,10vw,120px)] leading-[0.8]">Feedback</h1>
      <p className="mt-3 text-[15px] text-dust">
        {rows.length} note{rows.length === 1 ? '' : 's'}, newest first.{' '}
        <Link href="/admin/edits" className="font-semibold text-paper underline underline-offset-4">Edits</Link>{' · '}
        <Link href="/admin/uploads" className="font-semibold text-paper underline underline-offset-4">Uploads</Link>
      </p>
      {rows.length ? (
        <ol className="mt-6 divide-y divide-rule border-y border-rule">
          {rows.map((r) => (
            <li key={r._id.toString()} className="grid gap-2 py-4 md:grid-cols-[12rem_minmax(0,1fr)]">
              <div className="text-[13px]">
                <div className="text-paper">{when(new Date(r.at))}</div>
                <div className="font-display text-[14px] font-extrabold uppercase text-leaf-light">{String(r.kind)}</div>
                <div className="truncate text-dust">{r.contact || r.userEmail || 'anonymous'}</div>
              </div>
              <div className="min-w-0">
                <p className="text-[15px] whitespace-pre-line text-paper">{String(r.message)}</p>
                {r.page ? (
                  <Link href={String(r.page)} className="mt-1 inline-block text-[12.5px] text-dust underline underline-offset-2">
                    from {String(r.page)}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-8 text-[15px] text-dust">No feedback yet.</p>
      )}
    </div>
  );
}
