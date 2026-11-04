import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PlayButton } from '@/components/PlayButton';
import { PlaylistActions, RemoveFromPlaylist } from '@/components/PlaylistControls';
import { TrackList } from '@/components/TrackList';
import { getCatalog } from '@/lib/catalog';
import { formatRunTime, plural } from '@/lib/shows';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import type { TrackModel } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: 'Playlist' };

export default async function PlaylistPage({ params }: Params) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/playlists/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await supabaseServer();
  const { data: playlist } = await supabase.from('playlists').select('id, name, owner_id').eq('id', id).maybeSingle();
  if (!playlist) notFound();
  const { data: rows } = await supabase
    .from('playlist_tracks')
    .select('position, added_at, tracks(audio_url)')
    .eq('playlist_id', id)
    .order('position')
    .order('added_at');

  const catalog = await getCatalog();
  const byUrl = new Map(catalog.tracks.map((t) => [t.url, t]));
  const tracks = ((rows ?? []) as unknown as { tracks: { audio_url: string } | null }[])
    .map((r) => byUrl.get(r.tracks?.audio_url ?? ''))
    .filter((t): t is TrackModel => Boolean(t));
  const mine = playlist.owner_id === user.id;
  const source = `Playlist: ${playlist.name}`;

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <Link href="/playlists" className="text-[13px] font-semibold text-dust hover:text-paper">
        Playlists
      </Link>
      <h1 className="poster mt-2 text-[clamp(48px,9vw,120px)] leading-[0.85] break-words">{playlist.name}</h1>
      <p className="mt-3 text-[15px] text-dust tnum">
        {plural(tracks.length, 'track')}
        {tracks.length ? `, ${formatRunTime(tracks.reduce((n, t) => n + t.duration, 0))}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 py-6">
        {tracks.length ? <PlayButton tracks={tracks} source={source} label="Play playlist" /> : null}
        {mine ? <PlaylistActions id={playlist.id} name={playlist.name} /> : null}
      </div>
      {tracks.length ? (
        <>
          <TrackList tracks={tracks} variant="mixed" source={source} />
          {mine ? (
            <details className="mt-4 text-[14px]">
              <summary className="cursor-pointer font-semibold text-dust hover:text-paper">Remove tracks</summary>
              <ul className="mt-2">
                {tracks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between border-b border-rule py-2">
                    <span className="truncate">{t.title} <span className="text-dust">· {t.bandName}</span></span>
                    <RemoveFromPlaylist playlistId={playlist.id} audioUrl={t.url} />
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <p className="max-w-[44ch] text-[15px] text-paper/85">
          Empty for now. Tap the add-to-playlist button next to any track’s heart to put it here.
        </p>
      )}
    </div>
  );
}
