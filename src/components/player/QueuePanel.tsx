'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '@/stores/PlayerStore';
import { formatDuration, shortDate, trackTitle } from '@/lib/shows';
import { Equalizer } from '../art/Equalizer';
import { IconClose } from '../icons';

/** "Up next": the list playback came from, with the current track marked. */
export function QueuePanel() {
  const { open, queue, index, source, playing, setOpen, jumpTo } = usePlayerStore(
    useShallow((s) => ({
      open: s.queueOpen,
      queue: s.queue,
      index: s.index,
      source: s.queueSource,
      playing: s.playing,
      setOpen: s.setQueueOpen,
      jumpTo: s.jumpTo,
    })),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    currentRef.current?.scrollIntoView({ block: 'center' });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const upNext = queue.length - index - 1;

  return (
    <aside
      aria-label="Queue"
      className={clsx(
        'fixed z-50 flex flex-col border-rule bg-tape',
        // Mobile: full screen. Desktop: right rail above the player bar.
        'inset-0 md:inset-auto md:top-0 md:right-0 md:bottom-[88px] md:w-[380px] md:border-l',
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-rule px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3">
        <div className="min-w-0">
          <h2 ref={headingRef} tabIndex={-1} className="poster text-[34px] outline-none">
            Queue
          </h2>
          {source ? (
            <p className="truncate text-[13px] text-dust">
              Playing from {source}
              {upNext > 0 ? `, ${upNext} up next` : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close queue"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-paper/80 hover:text-paper"
        >
          <IconClose className="h-5 w-5" />
        </button>
      </div>
      {queue.length === 0 ? (
        <p className="px-5 py-6 text-[14px] text-dust">Nothing queued. Pick a show and press play.</p>
      ) : (
        <ol className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {queue.map((t, i) => {
            const isCurrent = i === index;
            const done = i < index;
            return (
              <li key={`${t.id}-${i}`} ref={isCurrent ? currentRef : undefined} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={clsx(
                    'grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-5 py-2.5 text-left outline-offset-[-2px]',
                    isCurrent ? 'bg-tape-2' : 'hover:bg-tape-2',
                    done && 'opacity-50',
                  )}
                >
                  <span className="text-[12px] text-dust tnum">
                    {isCurrent ? <Equalizer active={playing} className="text-leaf" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={clsx('block truncate text-[14px] font-semibold', isCurrent && 'text-leaf-light')}>
                      {trackTitle(t)}
                    </span>
                    <span className="block truncate text-[12.5px] text-dust">
                      {t.bandName} / {[shortDate(t.showDate), t.showName].filter(Boolean).join(' ')}
                    </span>
                  </span>
                  <span className="text-[12px] text-dust tnum">{formatDuration(t.duration)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
