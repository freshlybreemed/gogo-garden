'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '@/stores/PlayerStore';
import { formatDuration, plural, shortDate, trackTitle, venueHref } from '@/lib/shows';
import type { TrackModel } from '@/lib/types';
import { Equalizer } from './art/Equalizer';
import { LikeButton } from './LikeButton';
import { AddToPlaylist } from './AddToPlaylist';
import { IconPause, IconPlay } from './icons';

type Props = {
  tracks: TrackModel[];
  /**
   * `show`: rows inside one show (position + title).
   * `mixed`: tracks from many shows (band + show under the title).
   * `ranked`: like mixed, numbered by rank, with stream counts.
   */
  variant: 'show' | 'mixed' | 'ranked';
  /** Label for the queue panel ("Playing from ..."). */
  source: string;
  className?: string;
};

export function TrackList({ tracks, variant, source, className }: Props) {
  const { currentId, playing, toggleTrack } = usePlayerStore(
    useShallow((s) => ({
      currentId: s.currentTrack?.id,
      playing: s.playing,
      toggleTrack: s.toggleTrack,
    })),
  );

  return (
    <ol className={clsx('border-t border-rule', className)}>
      {tracks.map((track, i) => {
        const isCurrent = track.id === currentId;
        const title = trackTitle(track);
        const placeholder = track.part !== null;
        return (
          <li
            key={track.id}
            className={clsx(
              'group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-rule',
              isCurrent ? 'bg-tape-2' : 'hover:bg-tape',
            )}
          >
            {isCurrent ? <span className="absolute inset-y-0 left-0 w-[3px] bg-leaf" aria-hidden="true" /> : null}
            <button
              type="button"
              onClick={() => toggleTrack(track, tracks, source)}
              aria-label={`${isCurrent && playing ? 'Pause' : 'Play'} ${title}${placeholder ? `, ${track.showName}` : ''}`}
              aria-current={isCurrent ? 'true' : undefined}
              className="grid min-h-[52px] min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-center py-2 text-left outline-offset-[-2px]"
            >
              <span className="relative flex h-6 items-center justify-center text-[13px] text-dust tnum">
                {isCurrent ? (
                  <>
                    <Equalizer active={playing} className="text-leaf group-hover:hidden" />
                    {playing ? (
                      <IconPause className="hidden h-4 w-4 text-leaf group-hover:block" />
                    ) : (
                      <IconPlay className="hidden h-4 w-4 text-leaf group-hover:block" />
                    )}
                  </>
                ) : (
                  <>
                    <span className="group-hover:hidden">{i + 1}</span>
                    <IconPlay className="hidden h-4 w-4 text-paper group-hover:block" />
                  </>
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={clsx(
                    'block truncate text-[15px] font-semibold',
                    isCurrent ? 'text-leaf-light' : placeholder ? 'text-paper/85' : 'text-paper',
                  )}
                >
                  {title}
                </span>
                {variant !== 'show' ? (
                  <span className="block truncate text-[13px] text-dust">
                    {track.bandName}
                    <span aria-hidden="true"> / </span>
                    {[shortDate(track.showDate), track.showName].filter(Boolean).join(' ')}
                  </span>
                ) : null}
              </span>
            </button>
            <span className="flex items-center gap-3 pr-1 text-[13px] text-dust tnum sm:gap-4">
              {variant !== 'show' ? (
                <Link
                  href={track.venueSlug ? venueHref(track.venueSlug) : track.showHref}
                  className="hidden max-w-[16rem] truncate underline-offset-4 hover:text-paper hover:underline lg:block"
                >
                  {track.showName}
                </Link>
              ) : null}
              {variant === 'ranked' ? (
                <span className="hidden w-20 text-right sm:block">{plural(track.streams, 'play')}</span>
              ) : null}
              <span className="w-12 text-right">{formatDuration(track.duration)}</span>
              <AddToPlaylist url={track.url} title={title} className="hidden sm:inline-flex" />
              <LikeButton url={track.url} title={title} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
