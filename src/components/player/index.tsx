'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore, playerStoreSelectors } from '@/stores/PlayerStore';
import { formatTime } from '@/lib/helpers';
import { fountain, shortDate, trackTitle, venueHref } from '@/lib/shows';
import type { TrackModel } from '@/lib/types';
import {
  IconBack30,
  IconChevronDown,
  IconFwd30,
  IconMuted,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconQueue,
  IconSpeaker,
} from '../icons';
import { Slider } from './Slider';
import { QueuePanel } from './QueuePanel';

/** Seconds of playback before a listen counts as a stream. */
const STREAM_THRESHOLD_SECS = 30;

/**
 * Lives in the root layout, so it (and the <audio> element) never unmounts
 * while the user navigates between routes.
 */
export default function Player() {
  const current = usePlayerStore((s) => s.currentTrack);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <AudioEngine />
      {current ? (
        <>
          <PlayerBar track={current} onExpand={() => setExpanded(true)} />
          {expanded ? <NowPlayingSheet track={current} onClose={() => setExpanded(false)} /> : null}
        </>
      ) : null}
      <QueuePanel />
    </>
  );
}

/** The single <audio> element, driven by the store. */
function AudioEngine() {
  const ref = useRef<HTMLAudioElement>(null);
  const { track, playing, volume, cue } = usePlayerStore(
    useShallow((s) => ({ track: s.currentTrack, playing: s.playing, volume: s.volume, cue: s.cue })),
  );
  // Swapping `src` can emit a pause; ignore those so the store stays "playing".
  const swappedAt = useRef(0);

  // New track: swap the source. `playing` effect below starts it.
  useEffect(() => {
    const audio = ref.current;
    if (!audio || !track) return;
    if (audio.dataset.trackId !== track.id) {
      audio.dataset.trackId = track.id;
      swappedAt.current = performance.now();
      audio.src = track.url;
      usePlayerStore.getState().setTrackDuration(track.duration || 0);
      usePlayerStore.getState().setProgress(0);
    }
    if (usePlayerStore.getState().playing) {
      audio.play().catch((err) => console.log('play() failed', err));
    }
  }, [track]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio || !audio.src) return;
    if (playing) audio.play().catch((err) => console.log('play() failed', err));
    else audio.pause();
  }, [playing]);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio || cue.nonce === 0) return;
    audio.currentTime = cue.position;
  }, [cue]);

  // Lock-screen / hardware media keys.
  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return;
    const s = usePlayerStore.getState;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: trackTitle(track),
      artist: track.bandName,
      album: [shortDate(track.showDate), track.showName].filter(Boolean).join(' '),
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => s().resume()],
      ['pause', () => s().pause()],
      ['nexttrack', () => s().next()],
      ['previoustrack', () => s().previous()],
      ['seekbackward', () => s().rewind(30)],
      ['seekforward', () => s().forward(30)],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        /* unsupported action */
      }
    }
  }, [track]);

  // Tab title follows the track.
  useEffect(() => {
    if (!track) return;
    const previous = document.title;
    document.title = `${trackTitle(track)} – ${track.bandName}`;
    return () => {
      document.title = previous;
    };
  }, [track]);

  return (
    <audio
      ref={ref}
      preload="auto"
      className="hidden"
      onLoadedMetadata={(e) => {
        const d = e.currentTarget.duration;
        if (Number.isFinite(d)) usePlayerStore.getState().setTrackDuration(d);
      }}
      onTimeUpdate={(e) => {
        const s = usePlayerStore.getState();
        const t = e.currentTarget.currentTime;
        s.setProgress(t);
        if (t > STREAM_THRESHOLD_SECS && s.currentTrack) {
          // Store dedupes, so this fires once per play of a track.
          void s.streamUp(s.currentTrack.id);
        }
      }}
      onPlay={() => {
        if (!usePlayerStore.getState().playing) usePlayerStore.getState().resume();
      }}
      onPause={(e) => {
        // Paused from outside the app (headphones unplugged, OS controls).
        if (performance.now() - swappedAt.current < 1000) return;
        if (!e.currentTarget.ended && usePlayerStore.getState().playing) usePlayerStore.getState().pause();
      }}
      onEnded={() => usePlayerStore.getState().next()}
    />
  );
}

function usePlayerControls() {
  return usePlayerStore(
    useShallow((s) => ({
      playing: s.playing,
      volume: s.volume,
      muted: playerStoreSelectors.muted(s),
      duration: s.trackDuration,
      hasNext: s.index + 1 < s.queue.length,
      queueOpen: s.queueOpen,
      toggle: s.toggle,
      next: s.next,
      previous: s.previous,
      forward: s.forward,
      rewind: s.rewind,
      setVolume: s.setVolume,
      toggleMute: s.toggleMute,
      setQueueOpen: s.setQueueOpen,
    })),
  );
}

/** Seek bar; keeps its own value while dragging so the audio isn't scrubbed per pixel. */
function SeekBar({ compact = false }: { compact?: boolean }) {
  const progress = usePlayerStore((s) => s.progress);
  const duration = usePlayerStore((s) => s.trackDuration);
  const seek = usePlayerStore((s) => s.seek);
  const [drag, setDrag] = useState<number | null>(null);
  const value = drag ?? progress;

  return (
    <div className={clsx('flex w-full items-center gap-2.5 text-[12px] text-dust tnum', compact && 'gap-2')}>
      <span className="w-11 text-right">{formatTime(Math.floor(value))}</span>
      <Slider
        aria-label="Seek"
        aria-valuetext={`${formatTime(Math.floor(value))} of ${formatTime(Math.floor(duration))}`}
        max={duration}
        value={value}
        onSeekStart={() => setDrag(progress)}
        onChange={(v) => setDrag(v)}
        onCommit={() => {
          if (drag !== null) seek(drag);
          setDrag(null);
        }}
      />
      <span className="w-11">{formatTime(Math.floor(duration))}</span>
    </div>
  );
}

const ctl = 'inline-flex items-center justify-center text-paper/80 hover:text-paper disabled:opacity-30';

function Transport({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const c = usePlayerControls();
  const big = size === 'lg';
  return (
    <div className={clsx('flex items-center justify-center', big ? 'gap-6' : 'gap-3')}>
      <button type="button" className={clsx(ctl, 'h-10 w-10')} onClick={c.previous} aria-label="Previous track">
        <IconPrev className={big ? 'h-7 w-7' : 'h-5 w-5'} />
      </button>
      <button type="button" className={clsx(ctl, 'h-10 w-10')} onClick={() => c.rewind(30)} aria-label="Back 30 seconds">
        <IconBack30 className={big ? 'h-8 w-8' : 'h-6 w-6'} />
      </button>
      <button
        type="button"
        onClick={c.toggle}
        aria-label={c.playing ? 'Pause' : 'Play'}
        className={clsx(
          'inline-flex items-center justify-center bg-crank text-ink hover:bg-crank-hot active:translate-y-px',
          big ? 'h-20 w-20' : 'h-11 w-11',
        )}
      >
        {c.playing ? (
          <IconPause className={big ? 'h-9 w-9' : 'h-5 w-5'} />
        ) : (
          <IconPlay className={big ? 'h-9 w-9' : 'h-5 w-5'} />
        )}
      </button>
      <button type="button" className={clsx(ctl, 'h-10 w-10')} onClick={() => c.forward(30)} aria-label="Forward 30 seconds">
        <IconFwd30 className={big ? 'h-8 w-8' : 'h-6 w-6'} />
      </button>
      <button
        type="button"
        className={clsx(ctl, 'h-10 w-10')}
        onClick={c.next}
        disabled={!c.hasNext}
        aria-label="Next track"
      >
        <IconNext className={big ? 'h-7 w-7' : 'h-5 w-5'} />
      </button>
    </div>
  );
}

function TrackChip({ track, className }: { track: TrackModel; className?: string }) {
  return (
    <span
      className={clsx('flex shrink-0 flex-col justify-between overflow-hidden p-1.5 text-ink', className)}
      style={{ backgroundImage: fountain(track.palette) }}
      aria-hidden="true"
    >
      {/* The band name sits next to the chip; the chip carries the date. */}
      {(() => {
        const d = shortDate(track.showDate);
        const m = d?.match(/^(\d+-\d+)-(\d{2})$/);
        if (m) {
          return (
            <>
              <span className="poster block text-[15px] leading-[0.9] whitespace-nowrap md:text-[19px]">{m[1]}</span>
              <span className="poster block text-[13px] leading-none md:text-[16px]">&rsquo;{m[2]}</span>
            </>
          );
        }
        return <span className="poster mt-auto block text-[13px] leading-[0.9] md:text-[16px]">{d ?? 'Tape'}</span>;
      })()}
    </span>
  );
}

function PlayerBar({ track, onExpand }: { track: TrackModel; onExpand: () => void }) {
  const c = usePlayerControls();
  const progress = usePlayerStore((s) => s.progress);
  const pct = c.duration ? Math.min(100, (progress / c.duration) * 100) : 0;
  const title = trackTitle(track);

  return (
    <section
      aria-label="Player"
      className={clsx(
        'fixed inset-x-0 z-40 border-t border-rule bg-[#0f0d0a]',
        // Mobile: mini player above the tab bar. Desktop: full-width bar.
        'bottom-[calc(56px+env(safe-area-inset-bottom))] md:bottom-0',
      )}
    >
      {/* Mobile progress hairline */}
      <span className="absolute inset-x-0 top-0 h-[2px] bg-rule md:hidden" aria-hidden="true">
        <span className="block h-full bg-crank" style={{ width: `${pct}%` }} />
      </span>

      <div className="mx-auto grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 md:h-[88px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:gap-6 md:px-5">
        {/* Now playing */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onExpand}
            className="flex min-w-0 flex-1 items-center gap-3 text-left md:hidden"
            aria-label={`Open player: ${title}, ${track.bandName}`}
          >
            <TrackChip track={track} className="h-11 w-11" />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-paper">{title}</span>
              <span className="block truncate text-[12.5px] text-dust">
                {track.bandName} / {track.showName}
              </span>
            </span>
          </button>
          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <Link href={track.showHref} className="shrink-0" aria-label={`Go to show: ${track.showName}`}>
              <TrackChip track={track} className="h-14 w-14" />
            </Link>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-paper">{title}</span>
              <span className="block truncate text-[13px] text-dust">
                <Link href={`/bands/${encodeURIComponent(track.bandId)}`} className="hover:text-paper hover:underline">
                  {track.bandName}
                </Link>
                <span aria-hidden="true"> / </span>
                <Link href={track.showHref} className="hover:text-paper hover:underline">
                  {shortDate(track.showDate) ?? track.showName}
                </Link>
                {track.showDate ? (
                  <>
                    {' '}
                    {track.venueSlug ? (
                      <Link href={venueHref(track.venueSlug)} className="hover:text-paper hover:underline">
                        {track.showName}
                      </Link>
                    ) : (
                      track.showName
                    )}
                  </>
                ) : null}
              </span>
            </span>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={c.toggle}
            aria-label={c.playing ? 'Pause' : 'Play'}
            className="inline-flex h-11 w-11 items-center justify-center bg-crank text-ink"
          >
            {c.playing ? <IconPause className="h-5 w-5" /> : <IconPlay className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={c.next}
            disabled={!c.hasNext}
            aria-label="Next track"
            className={clsx(ctl, 'h-11 w-10')}
          >
            <IconNext className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop transport */}
        <div className="hidden flex-col items-center gap-0.5 md:flex">
          <Transport />
          <SeekBar />
        </div>

        {/* Desktop extras */}
        <div className="hidden items-center justify-end gap-2 md:flex">
          <button
            type="button"
            onClick={() => c.setQueueOpen(!c.queueOpen)}
            aria-pressed={c.queueOpen}
            aria-label="Queue"
            className={clsx(ctl, 'h-10 w-10', c.queueOpen && 'text-crank hover:text-crank')}
          >
            <IconQueue className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={c.toggleMute}
            aria-label={c.muted ? 'Unmute' : 'Mute'}
            className={clsx(ctl, 'h-10 w-10')}
          >
            {c.muted ? <IconMuted className="h-5 w-5" /> : <IconSpeaker className="h-5 w-5" />}
          </button>
          <div className="w-28 lg:w-36">
            <Slider aria-label="Volume" min={0} max={100} value={c.volume} onChange={c.setVolume} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Mobile full-screen player. */
function NowPlayingSheet({ track, onClose }: { track: TrackModel; onClose: () => void }) {
  const c = usePlayerControls();
  const closeRef = useRef<HTMLButtonElement>(null);
  const title = trackTitle(track);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
      className="fixed inset-0 z-50 flex flex-col bg-tar px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="flex items-center justify-between">
        <button ref={closeRef} type="button" onClick={onClose} className={clsx(ctl, 'h-11 w-11')} aria-label="Close player">
          <IconChevronDown className="h-6 w-6" />
        </button>
        <span className="truncate px-2 text-[13px] text-dust">{track.bandName}</span>
        <button
          type="button"
          onClick={() => {
            onClose();
            c.setQueueOpen(true);
          }}
          className={clsx(ctl, 'h-11 w-11')}
          aria-label="Queue"
        >
          <IconQueue className="h-6 w-6" />
        </button>
      </div>

      <Link
        href={track.showHref}
        onClick={onClose}
        className="mx-auto mt-4 flex aspect-square w-full max-w-[340px] flex-col justify-between p-5 text-ink"
        style={{ backgroundImage: fountain(track.palette) }}
      >
        <span className="poster text-[48px]">{track.bandName}</span>
        <span>
          <span className="poster block text-[72px]">{shortDate(track.showDate) ?? 'Tape'}</span>
          <span className="block font-display text-[22px] leading-tight font-extrabold uppercase">{track.showName}</span>
        </span>
      </Link>

      <div className="mt-auto">
        <h2 className="truncate text-[22px] font-bold">{title}</h2>
        <p className="truncate text-[14px] text-dust">
          {shortDate(track.showDate)}{' '}
          {track.venueSlug ? (
            <Link href={venueHref(track.venueSlug)} onClick={onClose} className="underline-offset-4 hover:text-paper hover:underline">
              {track.showName}
            </Link>
          ) : (
            track.showName
          )}
        </p>
        <div className="mt-4">
          <SeekBar />
        </div>
        <div className="mt-4">
          <Transport size="lg" />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={c.toggleMute} aria-label={c.muted ? 'Unmute' : 'Mute'} className={clsx(ctl, 'h-10 w-10')}>
            {c.muted ? <IconMuted className="h-5 w-5" /> : <IconSpeaker className="h-5 w-5" />}
          </button>
          <Slider aria-label="Volume" min={0} max={100} value={c.volume} onChange={c.setVolume} />
        </div>
      </div>
    </div>
  );
}
