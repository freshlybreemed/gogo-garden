import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UploadModeration } from '@/components/upload/UploadModeration';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Uploads (admin)' };

export default async function AdminUploadsPage() {
  const user = await currentUser();
  if (!isAdmin(user)) notFound();

  const admin = supabaseAdmin();
  const { data: uploads } = await admin
    .from('uploads')
    .select('id, title, kind, show_date, venue_text, venue_slug, track_count, status, new_band_name, created_at, user_id, band_id, bands(name), profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(200);
  const ids = (uploads ?? []).map((u) => u.id);
  const { data: tracks } = ids.length
    ? await admin.from('tracks').select('upload_id, title, position, audio_url, duration').in('upload_id', ids).order('position')
    : { data: [] };
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? '']));

  const rows = (uploads ?? []).map((u) => ({
    id: u.id as string,
    title: u.title as string,
    kind: u.kind as string,
    when: (u.show_date as string | null) ?? null,
    venue: (u.venue_text as string | null) ?? (u.venue_slug as string | null),
    status: u.status as string,
    newBand: (u.new_band_name as string | null) ?? null,
    createdAt: u.created_at as string,
    bandId: u.band_id as number | null,
    bandName: ((u.bands as unknown as { name: string } | null)?.name ?? (u.new_band_name as string | null)) || 'Unknown band',
    uploader: emailById.get(u.user_id as string) || ((u.profiles as unknown as { display_name: string } | null)?.display_name ?? 'someone'),
    tracks: (tracks ?? [])
      .filter((t) => t.upload_id === u.id)
      .map((t) => ({ title: t.title as string, url: t.audio_url as string, duration: t.duration as number })),
  }));

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(56px,10vw,120px)] leading-[0.8]">Uploads</h1>
      <p className="mt-3 text-[15px] text-dust">
        {rows.length} upload{rows.length === 1 ? '' : 's'}, newest first. Hide takes it off the site (reversible); Delete removes it and the files.{' '}
        <Link href="/upload" className="font-semibold text-paper underline underline-offset-4">Upload page</Link>
      </p>
      <UploadModeration rows={rows} />
    </div>
  );
}
