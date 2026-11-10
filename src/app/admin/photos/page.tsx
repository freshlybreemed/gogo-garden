import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PhotoReview } from '@/components/edit/PhotoReview';
import { isAdmin } from '@/lib/admin';
import { getCatalog } from '@/lib/catalog';
import { getDb } from '@/lib/db';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Photos to approve (admin)' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ all?: string }> };

export default async function AdminPhotosPage({ searchParams }: Props) {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();
  const showAll = (await searchParams).all === '1';
  const [docs, catalog] = await Promise.all([
    (await getDb()).collection('photoCandidates').find(showAll ? {} : { status: 'pending' }).sort({ bandName: 1, confidence: 1 }).toArray(),
    getCatalog(),
  ]);
  const groups = new Map<string, { bandId: string; bandName: string; currentPhotos: string[]; cands: { id: string; imageUrl: string; sourceUrl: string; sourceType: string; caption: string; why: string; confidence: string; status: string }[] }>();
  for (const d of docs) {
    const id = String(d.bandId);
    const band = catalog.bandById.get(id);
    const g = groups.get(id) ?? { bandId: id, bandName: band?.name ?? String(d.bandName), currentPhotos: band?.photos ?? [], cands: [] };
    g.cands.push({ id: d._id.toString(), imageUrl: String(d.imageUrl), sourceUrl: String(d.sourceUrl ?? ''), sourceType: String(d.sourceType ?? ''), caption: String(d.caption ?? ''), why: String(d.why ?? ''), confidence: String(d.confidence ?? ''), status: String(d.status ?? 'pending') });
    groups.set(id, g);
  }
  const list = [...groups.values()];

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(56px,10vw,120px)] leading-[0.8]">Photos</h1>
      <p className="mt-3 max-w-[72ch] text-[15px] text-dust">
        {docs.length} drafted photo{docs.length === 1 ? '' : 's'} for {list.length} band{list.length === 1 ? '' : 's'}. <b className="text-paper">Approve</b> adds it to the band’s photos,{' '}
        <b className="text-paper">Make main</b> makes it the face of the band, <b className="text-paper">Skip</b> drops it. Approved photos are copied to our storage and logged in{' '}
        <Link href="/admin/edits" className="font-semibold text-paper underline underline-offset-4">Edits</Link>.{' '}
        <Link href={showAll ? '/admin/photos' : '/admin/photos?all=1'} className="underline underline-offset-4">{showAll ? 'Show pending only' : 'Show decided too'}</Link>
      </p>
      {list.length ? <PhotoReview groups={list} /> : <p className="mt-8 text-[15px] text-dust">Nothing waiting. 🎉</p>}
    </div>
  );
}
