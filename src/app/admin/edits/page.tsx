import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EditLog } from '@/components/edit/EditLog';
import { isAdmin } from '@/lib/admin';
import { listEdits } from '@/lib/edits';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Edits (admin)' };
export const dynamic = 'force-dynamic';

export default async function AdminEditsPage() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  const rows = await listEdits(500);

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(56px,10vw,120px)] leading-[0.8]">Edits</h1>
      <p className="mt-3 max-w-[70ch] text-[15px] text-dust">
        Every change listeners make to titles, bios and members, newest first, with the value before and after. Revert puts the old value back
        (and logs that too).{' '}
        <Link href="/admin/uploads" className="font-semibold text-paper underline underline-offset-4">
          Uploads
        </Link>
      </p>
      <EditLog rows={rows} />
    </div>
  );
}
