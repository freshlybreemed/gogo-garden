// Plain, serializable models passed from Server Components to the client.

export type ArtistModel = {
  id: string;
  name: string;
  shortName: string;
  useShortName: boolean;
  image?: string;
};

/** Raw song document, lightly normalized (see queries.ts). */
export type SongDoc = {
  id: string;
  artistId: string;
  url: string;
  duration: number;
  artist: string;
  title: string;
  album: string;
  imageUrl: string;
  trackNumber: number;
  streams: number;
  /** Show date from the import (`YYYY-MM-DD`), if present. */
  showDate: string | null;
  venue: string | null;
  venueSlug: string | null;
  /** When the document was added (ObjectId timestamp, ISO). */
  addedAt: string;
  /** Import batch tag, e.g. "frshly-ingest-2026-11". */
  source: string | null;
};

/** A song as the UI sees it: resolved band and show. */
export type TrackModel = {
  id: string;
  url: string;
  duration: number;
  title: string;
  /** Part number when the title is a placeholder like "Track 7"; else null. */
  part: number | null;
  trackNumber: number;
  streams: number;
  bandId: string;
  bandName: string;
  palette: number;
  showHref: string;
  /** Venue for live shows, title for tapes. */
  showName: string;
  showDate: string | null;
  venueSlug: string | null;
};

export type BandModel = {
  id: string;
  name: string;
  /** Long name when the display name is a short one ("RE" -> "Reaction Band"). */
  fullName: string | null;
  image: string | null;
  palette: number;
  showCount: number;
  trackCount: number;
  firstDate: string | null;
  lastDate: string | null;
  /** New to the app (bands id >= 45). */
  isNew: boolean;
};

export type ShowModel = {
  key: string;
  href: string;
  bandId: string;
  bandName: string;
  palette: number;
  album: string;
  kind: 'live' | 'tape';
  date: string | null;
  venue: string | null;
  venueSlug: string | null;
  title: string;
  note: string | null;
  disc: number | null;
  trackCount: number;
  duration: number;
  streams: number;
  addedAt: string;
  /** Has songs from the latest ingest or added in the last 14 days. */
  isNew: boolean;
};

/** Normalized `venues` document (the researched write-up). */
export type VenueDoc = {
  slug: string;
  name: string;
  aka: string[];
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  yearsActive: string | null;
  status: string | null;
  now: string | null;
  summary: string | null;
  history: string | null;
  gogoImpact: string | null;
  notableBands: string[];
  memories: { quote: string; author: string | null; sourceUrl: string | null; date: string | null }[];
  photos: { url: string; credit: string | null; sourceUrl: string | null; caption: string | null; kind: string | null }[];
  sources: { title: string | null; url: string }[];
  /** Other slugs for the same room or its successors (le-pearl <-> msg). */
  related: string[];
  /** How well-sourced the write-up is; `low` means only the name is trusted. */
  confidence: 'high' | 'medium' | 'low' | null;
  /** Researcher's notes on sourcing. */
  notes: string | null;
};

export type VenueModel = {
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  status: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  showCount: number;
  trackCount: number;
  bandCount: number;
  firstDate: string | null;
  lastDate: string | null;
  photo: string | null;
};
