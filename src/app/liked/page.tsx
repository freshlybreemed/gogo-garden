import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlayButton } from '@/components/PlayButton';
import { TrackList } from '@/components/TrackList';
import { getCatalog } from '@/lib/catalog';
import { plural } from '@/lib/shows';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import type { TrackModel } from '@/lib/types';

export const metadata: Metadata = { title: 'Liked songs' };

export default async function LikedPage() {
  const user = await currentUser();
  if (!user) redirect('/login');

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('likes')
    .select('created_at, tracks(audio_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const catalog = await getCatalog();
  const byUrl = new Map(catalog.tracks.map((t) => [t.url, t]));
  const tracks = (data ?? [])
    .map((r) => byUrl.get((r as unknown as { tracks: { audio_url: string } | null }).tracks?.audio_url ?? ''))
    .filter((t): t is TrackModel => Boolean(t));

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(64px,12vw,140px)] leading-[0.8]">Liked</h1>
      <p className="mt-3 text-[15px] text-dust">{plural(tracks.length, 'song')}, newest first.</p>
      {tracks.length ? (
        <>
          <div className="py-6">
            <PlayButton tracks={tracks} source="Liked songs" label="Play liked" />
          </div>
          <TrackList tracks={tracks} variant="mixed" source="Liked songs" />
        </>
      ) : (
        <p className="mt-8 max-w-[40ch] text-[16px] text-paper/85">
          Tap the heart on any track to save it here.{' '}
          <Link href="/" className="font-semibold text-paper underline underline-offset-4 hover:text-crank">
            Dig in the crates
          </Link>
          .
        </p>
      )}
    </div>
  );
}
