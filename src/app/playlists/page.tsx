import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NewPlaylistForm } from '@/components/PlaylistControls';
import { plural } from '@/lib/shows';
import { currentUser, supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Playlists' };

export default async function PlaylistsPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/playlists');
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('playlists')
    .select('id, name, updated_at, playlist_tracks(count)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });
  const playlists = (data ?? []) as unknown as { id: string; name: string; playlist_tracks: { count: number }[] }[];

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster text-[clamp(64px,12vw,140px)] leading-[0.8]">Playlists</h1>
      <div className="mt-6 max-w-md">
        <NewPlaylistForm />
      </div>
      <ul className="mt-8 border-t border-rule">
        <li className="border-b border-rule">
          <Link href="/liked" className="flex items-center justify-between py-4 pr-2 hover:bg-tape">
            <span className="text-[17px] font-semibold">Liked songs</span>
            <span className="text-[13px] text-dust">Your hearts</span>
          </Link>
        </li>
        {playlists.map((p) => (
          <li key={p.id} className="border-b border-rule">
            <Link href={`/playlists/${p.id}`} className="flex items-center justify-between py-4 pr-2 hover:bg-tape">
              <span className="truncate text-[17px] font-semibold">{p.name}</span>
              <span className="text-[13px] text-dust tnum">{plural(p.playlist_tracks[0]?.count ?? 0, 'track')}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!playlists.length ? (
        <p className="mt-6 max-w-[44ch] text-[15px] text-paper/85">
          Make one above, or tap the add-to-playlist button next to any track’s heart.
        </p>
      ) : null}
    </div>
  );
}
