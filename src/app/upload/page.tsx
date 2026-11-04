import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UploadForm } from '@/components/upload/UploadForm';
import { getCatalog } from '@/lib/catalog';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Upload' };

export default async function UploadPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/upload');
  const catalog = await getCatalog();
  const bands = catalog.bands
    .filter((b) => !b.id.startsWith('x-'))
    .map((b) => ({ id: Number(b.id), name: b.fullName ?? b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const venues = [...catalog.venueDocs.values()]
    .map((v) => ({ slug: v.slug, name: v.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(64px,12vw,140px)] leading-[0.8]">Upload</h1>
      <p className="mt-3 max-w-[60ch] text-[15px] text-dust">
        Got tapes? Put them in the garden. Pick the band, name the album or show, drop the MP3s. It goes live right away.
      </p>
      <UploadForm userId={user.id} bands={bands} venues={venues} />
    </div>
  );
}
