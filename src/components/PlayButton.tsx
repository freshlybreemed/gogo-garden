'use client';

import { useTransition } from 'react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '@/stores/PlayerStore';
import { digCrates } from '@/app/actions';
import type { TrackModel } from '@/lib/types';
import { IconCrate, IconPause, IconPlay } from './icons';

/** Big square play/pause for a whole list (a show, a band's popular tracks). */
export function PlayButton({
  tracks,
  source,
  label = 'Play',
  className,
}: {
  tracks: TrackModel[];
  source: string;
  label?: string;
  className?: string;
}) {
  const { playing, current, queueSource, playList, toggle } = usePlayerStore(
    useShallow((s) => ({
      playing: s.playing,
      current: s.currentTrack,
      queueSource: s.queueSource,
      playList: s.playList,
      toggle: s.toggle,
    })),
  );
  const active = Boolean(current) && queueSource === source && tracks.some((t) => t.id === current?.id);
  const showPause = active && playing;

  return (
    <button
      type="button"
      disabled={!tracks.length}
      onClick={() => (active ? toggle() : playList(tracks, 0, source))}
      className={clsx(
        'inline-flex h-12 items-center gap-2.5 bg-crank pr-5 pl-4 text-[15px] font-bold text-ink',
        'hover:bg-crank-hot active:translate-y-px disabled:opacity-40',
        className,
      )}
    >
      {showPause ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
      {showPause ? 'Pause' : label}
    </button>
  );
}

/** "Dig in the crates": queue a random run from the whole library. */
export function CrateButton({ className }: { className?: string }) {
  const playList = usePlayerStore((s) => s.playList);
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const tracks = await digCrates(40);
          playList(tracks, 0, 'Dig in the crates');
        })
      }
      className={clsx(
        'inline-flex h-14 items-center gap-3 bg-ink px-6 text-[17px] font-bold text-paper',
        'hover:bg-tape-2 active:translate-y-px disabled:opacity-70',
        className,
      )}
    >
      <IconCrate className={clsx('h-6 w-6', pending && 'animate-pulse')} />
      {pending ? 'Pulling tapes…' : 'Dig in the crates'}
    </button>
  );
}
