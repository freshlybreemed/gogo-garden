'use client';

import { useEffect, useImperativeHandle, useRef } from 'react';
import type { TrackModel } from '@/lib/types';

export type PlayerHandle = {
  seekTo: (position: number) => void;
};

export interface MP3PlayerWidgetProps {
  player: React.Ref<PlayerHandle>;
  playing?: boolean;
  volume?: number;
  onReady?: (trackDuration: number) => void;
  onPlayProgressChange?: (position: number) => void;
  playNextSong: () => void;
  track: TrackModel;
}

/** Hidden <audio> element (replaces react-player/file). */
export function MP3Player({
  player,
  onPlayProgressChange,
  onReady,
  track,
  playing,
  volume = 80,
  playNextSong,
}: MP3PlayerWidgetProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useImperativeHandle(player, () => ({
    seekTo(position: number) {
      const audio = audioRef.current;
      if (audio && Number.isFinite(position)) {
        audio.currentTime = Math.max(0, position);
      }
    },
  }));

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch((err) => console.log('play() failed', err));
    } else {
      audio.pause();
    }
  }, [playing, track.url]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  return (
    <audio
      ref={audioRef}
      src={track.url}
      preload="auto"
      style={{ display: 'none' }}
      onLoadedMetadata={(e) => onReady?.(e.currentTarget.duration)}
      onTimeUpdate={(e) => onPlayProgressChange?.(e.currentTarget.currentTime)}
      onEnded={playNextSong}
    />
  );
}
