import data from '@/data/papalace.json';
import { paletteFor, slugify } from './shows';
import type { TrackModel } from './types';

/**
 * PA Palace Music (papalace.com): a go-go PA-tape store. We index its public catalog
 * (scripts/fetch-papalace.mjs) and stream the public files; nothing is re-hosted, and every
 * tape links back to its PA Palace product page.
 */
export type PalaceTrack = { title: string; url: string; size: number };
export type PalaceTape = {
  id: number;
  band: string;
  date: string | null;
  venue: string | null;
  title: string;
  link: string;
  tracks: PalaceTrack[];
};

export type PalaceData = { source: string; base: string; fetchedAt: string; tapes: PalaceTape[] };

export const palace = data as PalaceData;

/** A title with no real name: "Track 7", "TR 3", "PT 3", or a bare number left from a filename. */
const PLACEHOLDER = /^(track|tr|pt|part)?\s*\d+$/i;
export const isPlaceholder = (title: string) => PLACEHOLDER.test(title.trim());

/** Show a real song title, or "Track N" for a placeholder. */
export const displayTitle = (title: string, n: number) => (isPlaceholder(title) ? `Track ${n}` : title);

/** Build player tracks for one tape. Ids are "palace-<tape>-<n>" (not Mongo ids: streamUp skips them). */
export function palaceTrackModels(tape: PalaceTape): TrackModel[] {
  const palette = paletteFor(`palace-${tape.band}`);
  const bandId = `palace-${slugify(tape.band) || tape.id}`;
  const where = tape.venue ?? tape.title;
  return tape.tracks.map((t, i) => ({
    id: `palace-${tape.id}-${i}`,
    url: t.url,
    duration: 0,
    title: displayTitle(t.title, i + 1),
    part: null,
    trackNumber: i + 1,
    streams: 0,
    bandId,
    bandName: tape.band,
    palette,
    showHref: tape.link,
    showName: where,
    showDate: tape.date,
    year: tape.date?.slice(0, 4) ?? null,
    venueSlug: null,
    image: null,
    bandImage: null,
  }));
}
