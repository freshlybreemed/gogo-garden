'use client';

import { usePlayerStore } from '@/stores/PlayerStore';
import { Equalizer } from './Equalizer';

/** Equalizer shown on a card when the current track belongs to it. */
export function NowPlayingMark({
  showHref,
  bandId,
  className,
}: {
  showHref?: string;
  bandId?: string;
  className?: string;
}) {
  const playing = usePlayerStore((s) => s.playing);
  const current = usePlayerStore((s) => s.currentTrack);
  if (!current) return null;
  const match = showHref ? current.showHref === showHref : bandId ? current.bandId === bandId : false;
  if (!match) return null;
  return <Equalizer active={playing} className={className} />;
}
