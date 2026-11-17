'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '@/stores/PlayerStore';
import { palaceTrackModels, isPlaceholder, type PalaceTape } from '@/lib/palace';
import { formatDuration, fountain, longDate, paletteFor, plural } from '@/lib/shows';
import { Equalizer } from '@/components/art/Equalizer';
import { IconPause, IconPlay, IconSearch } from '@/components/icons';

/** Lowercase, drop punctuation: "N.E. Groovers" ~ "ne groovers". */
const loose = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

export function PalaceBrowser({ tapes }: { tapes: PalaceTape[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const results = useMemo(() => {
    const needle = loose(q);
    if (!needle) return tapes;
    const words = needle.split(' ');
    return tapes.filter((t) => {
      const hay = loose([t.band, t.venue, t.title, t.date, ...t.tracks.map((x) => x.title)].filter(Boolean).join(' '));
      return words.every((w) => hay.includes(w));
    });
  }, [q, tapes]);

  const { currentId, playing, toggleTrack, playList } = usePlayerStore(
    useShallow((s) => ({ currentId: s.currentTrack?.id, playing: s.playing, toggleTrack: s.toggleTrack, playList: s.playList })),
  );

  const trackTotal = tapes.reduce((n, t) => n + t.tracks.length, 0);

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-tar/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex items-center gap-3 border-b-2 border-rule focus-within:border-crank">
          <IconSearch className="h-5 w-5 shrink-0 text-dust" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search band, venue, date, song…"
            className="h-12 w-full bg-transparent text-[18px] text-paper outline-none placeholder:text-dust"
            autoFocus
          />
        </div>
        <p className="mt-2 text-[13px] text-dust tnum">
          {q ? plural(results.length, 'tape') : `${plural(tapes.length, 'tape')}, ${plural(trackTotal, 'track')}`}
        </p>
      </div>

      {results.length === 0 ? (
        <p className="py-16 text-center text-[15px] text-dust">No tapes match “{q}”.</p>
      ) : (
        <ul className="mt-2">
          {results.map((tape) => {
            const models = palaceTrackModels(tape);
            const isOpen = open === tape.id;
            const palette = paletteFor(`palace-${tape.band}`);
            const anyCurrent = models.some((m) => m.id === currentId);
            return (
              <li key={tape.id} className="border-b border-rule">
                <div className="flex items-stretch gap-3">
                  <button
                    type="button"
                    onClick={() => (anyCurrent && playing ? usePlayerStore.getState().pause() : playList(models, 0, `PA Palace · ${tape.band}`))}
                    aria-label={`Play ${tape.band}${tape.venue ? ` at ${tape.venue}` : ''}`}
                    className="flex w-11 shrink-0 items-center justify-center text-ink"
                    style={{ backgroundImage: fountain(palette) }}
                  >
                    {anyCurrent && playing ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
                  </button>
                  <button type="button" onClick={() => setOpen(isOpen ? null : tape.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 flex-col py-2.5 text-left">
                    <span className={clsx('truncate text-[16px] font-semibold', anyCurrent ? 'text-leaf-light' : 'text-paper')}>
                      {tape.band}
                      {anyCurrent ? <Equalizer active={playing} className="ml-2 inline-block text-leaf" /> : null}
                    </span>
                    <span className="truncate text-[13px] text-dust tnum">
                      {[tape.date ? longDate(tape.date) : null, tape.venue].filter(Boolean).join(' · ') || tape.title}
                      <span aria-hidden> · </span>
                      {plural(tape.tracks.length, 'track')}
                    </span>
                  </button>
                </div>

                {isOpen ? (
                  <ol className="mb-2 ml-11 border-l border-rule">
                    {models.map((track, i) => {
                      const isCurrent = track.id === currentId;
                      return (
                        <li key={track.id}>
                          <button
                            type="button"
                            onClick={() => toggleTrack(track, models, `PA Palace · ${tape.band}`)}
                            className={clsx('flex w-full items-center gap-3 py-2 pr-2 pl-3 text-left', isCurrent ? 'bg-tape-2' : 'hover:bg-tape')}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[12px] text-dust tnum">
                              {isCurrent ? <Equalizer active={playing} className="text-leaf" /> : i + 1}
                            </span>
                            <span className={clsx('min-w-0 flex-1 truncate text-[14px]', isCurrent ? 'text-leaf-light' : isPlaceholder(track.title) ? 'text-paper/70' : 'text-paper')}>
                              {track.title}
                            </span>
                            {track.duration ? <span className="text-[12px] text-dust tnum">{formatDuration(track.duration)}</span> : null}
                          </button>
                        </li>
                      );
                    })}
                    <li className="px-3 py-2">
                      <a href={tape.link} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-dust underline underline-offset-4 hover:text-paper">
                        Open on PA Palace ↗
                      </a>
                    </li>
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
