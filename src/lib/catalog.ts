import 'server-only';
import { getArtists, getSongs, getVenueDocs } from './queries';
import {
  genericTrackNumber,
  normalizeName,
  paletteFor,
  parseAlbum,
  shortHash,
  slugify,
} from './shows';
import type { ArtistModel, BandModel, ShowModel, SongDoc, TrackModel, VenueDoc, VenueModel } from './types';

/**
 * The whole library is small (a few thousand songs), so it's loaded once and
 * indexed in memory: bands -> shows -> tracks. Refreshed every minute so new
 * imports show up without a restart.
 */
export type Catalog = {
  bands: BandModel[];
  bandById: Map<string, BandModel>;
  shows: ShowModel[];
  showByHref: Map<string, ShowModel>;
  showsByBand: Map<string, ShowModel[]>;
  tracksByShow: Map<string, TrackModel[]>;
  tracks: TrackModel[];
  trackById: Map<string, TrackModel>;
  venues: VenueModel[];
  venueBySlug: Map<string, VenueModel>;
  venueDocs: Map<string, VenueDoc>;
  showsByVenue: Map<string, ShowModel[]>;
  /** Lowercased search haystack per track (title, band, album, venue). */
  haystack: Map<string, string>;
};

const TTL_MS = 60_000;

/** Songs added in the last two weeks are "new"; a band is new when its first tape is. */
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// Not `lastModified`: streamUp stamps that on every play, so it would mark
// any recently played show as new.
function isNewSong(s: SongDoc, now: number) {
  return now - Date.parse(s.addedAt) < NEW_WINDOW_MS;
}
const g = globalThis as unknown as { _catalog?: { at: number; promise: Promise<Catalog> } };

export function getCatalog(): Promise<Catalog> {
  const now = Date.now();
  if (!g._catalog || now - g._catalog.at > TTL_MS) {
    const promise = load();
    g._catalog = { at: now, promise };
    promise.catch(() => {
      if (g._catalog?.promise === promise) g._catalog = undefined;
    });
  }
  return g._catalog.promise;
}

/** Drop the cached catalog so the next request reloads it (after uploads / moderation). */
export function invalidateCatalog() {
  g._catalog = undefined;
}

/** Keep the cached count in step with a streamUp so "most streamed" stays live. */
export async function bumpCachedStream(trackId: string) {
  if (!g._catalog) return;
  const catalog = await g._catalog.promise.catch(() => null);
  const track = catalog?.trackById.get(trackId);
  if (!track) return;
  track.streams += 1;
  const show = catalog?.showByHref.get(track.showHref);
  if (show) show.streams += 1;
}

const displayName = (a: ArtistModel) =>
  (a.useShortName ? a.shortName : a.name) || a.name || a.shortName || 'Unknown band';

function byDateDesc(a: ShowModel, b: ShowModel) {
  // Dated shows newest first; undated tapes after, alphabetical.
  if (a.date && b.date) return b.date.localeCompare(a.date) || (a.disc ?? 0) - (b.disc ?? 0);
  if (a.date) return -1;
  if (b.date) return 1;
  return a.title.localeCompare(b.title);
}

function trackOrder(a: SongDoc, b: SongDoc) {
  const an = Number.isFinite(a.trackNumber) ? a.trackNumber : Infinity;
  const bn = Number.isFinite(b.trackNumber) ? b.trackNumber : Infinity;
  if (an !== bn) return an - bn;
  const ap = genericTrackNumber(a.title);
  const bp = genericTrackNumber(b.title);
  if (ap !== null && bp !== null) return ap - bp;
  return a.title.localeCompare(b.title, undefined, { numeric: true });
}

async function load(): Promise<Catalog> {
  const now = Date.now();
  const [artists, songs, venueDocList] = await Promise.all([
    getArtists(),
    getSongs(),
    // The write-ups are optional; the library works without them.
    getVenueDocs().catch((err) => {
      console.error('[catalog] venues unavailable', err);
      return [] as VenueDoc[];
    }),
  ]);

  // Resolve every song to a band: by artistId, then by name, else a synthetic band.
  const artistById = new Map(artists.map((a) => [a.id, a]));
  const artistByName = new Map<string, ArtistModel>();
  for (const a of artists) {
    for (const n of [a.name, a.shortName]) if (n) artistByName.set(normalizeName(n), a);
  }

  type BandAcc = {
    id: string;
    name: string;
    fullName: string | null;
    image: string | null;
    artist: ArtistModel | null;
    songs: SongDoc[];
  };
  const bandAcc = new Map<string, BandAcc>();
  for (const a of artists) {
    bandAcc.set(a.id, {
      id: a.id,
      name: displayName(a),
      fullName: a.name && a.name !== displayName(a) ? a.name : null,
      image: a.image || null,
      artist: a,
      songs: [],
    });
  }

  for (const song of songs) {
    const band =
      (song.artistId !== '' && artistById.get(song.artistId)) ||
      artistByName.get(normalizeName(song.artist));
    let id = band ? band.id : undefined;
    if (!id) {
      const slug = slugify(song.artist) || 'unknown';
      id = `x-${slug}`;
      if (!bandAcc.has(id)) {
        bandAcc.set(id, { id, name: song.artist || 'Unknown band', fullName: null, image: null, artist: null, songs: [] });
      }
    }
    bandAcc.get(id)!.songs.push(song);
  }

  const aliases = new Set<string>();
  for (const b of bandAcc.values()) aliases.add(normalizeName(b.name));
  for (const a of artists) for (const n of [a.name, a.shortName]) if (n) aliases.add(normalizeName(n));

  const bands: BandModel[] = [];
  const shows: ShowModel[] = [];
  const showsByBand = new Map<string, ShowModel[]>();
  const tracksByShow = new Map<string, TrackModel[]>();
  const tracks: TrackModel[] = [];
  const haystack = new Map<string, string>();

  for (const acc of bandAcc.values()) {
    const palette = paletteFor(acc.id + acc.name);

    // Fall back to the most common cover on the band's songs.
    const image = acc.image ?? mostCommon(acc.songs.map((s) => s.imageUrl));

    const byAlbum = new Map<string, SongDoc[]>();
    for (const s of acc.songs) {
      const list = byAlbum.get(s.album);
      if (list) list.push(s);
      else byAlbum.set(s.album, [s]);
    }

    const bandShows: ShowModel[] = [];
    for (const [album, albumSongs] of byAlbum) {
      albumSongs.sort(trackOrder);
      const first = albumSongs[0];
      // "Singles" is a bucket of loose tracks: one song's date or venue isn't the bucket's.
      const loose = /^singles$/i.test(album.trim());
      const info = parseAlbum(album, {
        date: loose ? null : first.showDate,
        venue: loose ? null : first.venue,
        aliases,
      });
      const showImage = mostCommon(albumSongs.map((s) => s.imageUrl)) ?? image;
      const showYear = info.date?.slice(0, 4) ?? (loose ? null : mostCommon(albumSongs.map((s) => s.year)));
      const slugBase = slugify([info.date, info.venue ?? info.title].filter(Boolean).join(' ')) || 'tape';
      const href = `/shows/${encodeURIComponent(acc.id)}/${slugBase}-${shortHash(album)}`;
      const show: ShowModel = {
        key: `${acc.id}|${album}`,
        href,
        bandId: acc.id,
        bandName: acc.name,
        palette,
        album,
        kind: info.kind,
        date: info.date,
        venue: info.venue,
        venueSlug: info.kind === 'live' ? first.venueSlug : null,
        title: info.title,
        note: info.note,
        disc: info.disc,
        trackCount: albumSongs.length,
        duration: albumSongs.reduce((n, s) => n + s.duration, 0),
        streams: albumSongs.reduce((n, s) => n + s.streams, 0),
        addedAt: albumSongs.reduce((max, s) => (s.addedAt > max ? s.addedAt : max), ''),
        isNew: albumSongs.some((s) => isNewSong(s, now)),
        image: showImage,
        year: showYear,
      };
      const showTracks = albumSongs.map<TrackModel>((s) => ({
        id: s.id,
        url: s.url,
        duration: s.duration,
        title: s.title,
        part: genericTrackNumber(s.title),
        trackNumber: s.trackNumber,
        streams: s.streams,
        bandId: acc.id,
        bandName: acc.name,
        palette,
        showHref: href,
        showName: info.kind === 'live' ? (info.venue ?? '') : info.title,
        showDate: info.date,
        venueSlug: info.kind === 'live' ? first.venueSlug : null,
        image: s.imageUrl || showImage,
        bandImage: image,
        year: s.year ?? showYear,
      }));
      for (const t of showTracks) {
        haystack.set(
          t.id,
          [t.title, acc.name, album, info.venue ?? '', info.title].join(' \u0000 ').toLowerCase(),
        );
      }
      bandShows.push(show);
      tracksByShow.set(href, showTracks);
      tracks.push(...showTracks);
    }

    bandShows.sort(byDateDesc);
    shows.push(...bandShows);
    showsByBand.set(acc.id, bandShows);
    // Every track counts toward the span: its show date, else its own year. That way undated
    // tapes and loose singles (which have no show-level year) still stretch it.
    const dates = acc.songs.map((s) => s.showDate ?? s.year).filter((d): d is string => Boolean(d)).sort();
    bands.push({
      id: acc.id,
      name: acc.name,
      fullName: acc.fullName,
      image,
      palette,
      showCount: bandShows.length,
      trackCount: acc.songs.length,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      isNew: acc.songs.length > 0 && acc.songs.every((s) => isNewSong(s, now)),
      bio: acc.artist?.bio ?? null,
      founded: acc.artist?.founded ?? null,
      members: acc.artist?.members ?? [],
      sources: acc.artist?.sources ?? [],
    });
  }

  bands.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  // Venues: every canonical venueSlug on a show, enriched by its write-up if any.
  const venueDocs = new Map(venueDocList.map((v) => [v.slug, v]));
  const showsByVenue = new Map<string, ShowModel[]>();
  for (const show of shows) {
    if (!show.venueSlug) continue;
    const list = showsByVenue.get(show.venueSlug);
    if (list) list.push(show);
    else showsByVenue.set(show.venueSlug, [show]);
  }
  const venues: VenueModel[] = [];
  for (const [slug, list] of showsByVenue) {
    list.sort(byDateDesc);
    const doc = venueDocs.get(slug);
    const dates = list.map((s) => s.date).filter((d): d is string => Boolean(d)).sort();
    const nights = new Set(list.map((s) => `${s.bandId}|${s.date ?? s.album}`));
    if (doc?.name) for (const s of list) s.venue = doc.name;
    venues.push({
      slug,
      name: doc?.name || list[0].venue || slug,
      city: doc && doc.confidence !== 'low' ? doc.city : null,
      state: doc && doc.confidence !== 'low' ? doc.state : null,
      // A low-confidence write-up only vouches for the name.
      status: doc && doc.confidence !== 'low' ? doc.status : null,
      confidence: doc?.confidence ?? null,
      showCount: nights.size,
      trackCount: list.reduce((n, s) => n + s.trackCount, 0),
      bandCount: new Set(list.map((s) => s.bandId)).size,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      photo: doc && doc.confidence !== 'low' ? (doc.photos[0]?.url ?? null) : null,
    });
  }
  venues.sort((a, b) => b.showCount - a.showCount || b.trackCount - a.trackCount || a.name.localeCompare(b.name));
  // Search should find a venue by its other names too.
  for (const t of tracks) {
    const doc = t.venueSlug ? venueDocs.get(t.venueSlug) : undefined;
    if (doc) {
      if (doc.name) t.showName = doc.name;
      haystack.set(t.id, `${haystack.get(t.id) ?? ''} \u0000 ${[doc.name, ...doc.aka, doc.city ?? ''].join(' ')}`.toLowerCase());
    }
  }

  return {
    bands,
    bandById: new Map(bands.map((b) => [b.id, b])),
    shows,
    showByHref: new Map(shows.map((s) => [s.href, s])),
    showsByBand,
    tracksByShow,
    tracks,
    trackById: new Map(tracks.map((t) => [t.id, t])),
    haystack,
    venues,
    venueBySlug: new Map(venues.map((v) => [v.slug, v])),
    venueDocs,
    showsByVenue,
  };
}

export function recentlyAdded(c: Catalog, limit: number) {
  // Every kind of tape counts: singles and undated PAs are new growth too.
  return [...c.shows]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || byDateDesc(a, b))
    .slice(0, limit);
}

export function mostStreamed(c: Catalog, limit: number) {
  return [...c.tracks]
    .filter((t) => t.streams > 0)
    .sort((a, b) => b.streams - a.streams)
    .slice(0, limit);
}

export function popularForBand(c: Catalog, bandId: string, limit: number) {
  const shows = c.showsByBand.get(bandId) ?? [];
  // Ties (most tapes have no streams yet) favour named songs from newer shows.
  const all = shows.flatMap((s) => c.tracksByShow.get(s.href) ?? []);
  return all
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t.streams - a.t.streams || Number(a.t.part !== null) - Number(b.t.part !== null) || a.i - b.i)
    .slice(0, limit)
    .map(({ t }) => t);
}

export type SearchSection = 'bands' | 'venues' | 'shows' | 'tracks';

/** Loose form for matching: lowercase, no punctuation, "impressionz" ~ "impressions", no "band"/"the". */
function loose(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && w !== 'band' && w !== 'the')
    .map((w) => w.replace(/z$/, 's'))
    .join(' ');
}

/** How well `q` names `name`: 3 exact, 2 starts with, 1 contains every word, 0 no. */
function nameScore(q: string, name: string) {
  const a = loose(q);
  const b = loose(name);
  if (!a || !b) return 0;
  if (a === b || a.replace(/ /g, '') === b.replace(/ /g, '')) return 3;
  if (b.startsWith(a)) return 2;
  return a.split(' ').every((w) => b.includes(w)) ? 1 : 0;
}

/** Full names and nicknames people search by, keyed by the band's name on the site. */
const KNOWN_AS: Record<string, string[]> = {
  BYB: ['Backyard Band', 'Backyard'],
  TOB: ['TakeOva Band', 'Take Over Band'],
  TCB: ['Total Control Band', 'TC Bounce'],
  'New Impressionz': ['NIB', 'New Impressions'],
  'New Vision': ['NVB'],
  'Nexx Level': ['NLB', 'Next Level'],
  'Tru Expressionz': ['TEB', 'True Expressions'],
  'E.U.': ['EU', 'Experience Unlimited'],
  'Rare Essence': ['RE'],
  'Junkyard Band': ['JYB', 'Junkyard'],
  NEG: ['Northeast Groovers'],
  '3DB': ['Third Dimension Band'],
  CCB: ['Critical Condition Band'],
  Reaction: ['Reaction Band'],
  Renegade: ['Renegade Band'],
  'Chuck Brown': ['Chuck Brown and the Soul Searchers', 'Soul Searchers'],
};

/** Every name a band goes by: site name, full name, known nicknames, and "X, better known as" from the bio. */
function bandNames(b: BandModel) {
  const fromBio = b.bio?.match(/^([A-Z][^,.]{2,50}),? (?:better )?known as/)?.[1];
  return [b.name, b.fullName, ...(KNOWN_AS[b.name] ?? []), fromBio].filter((n): n is string => Boolean(n));
}

const DATE_RE = /^(\d{1,2}[-/.]\d{1,2}([-/.]\d{2,4})?|(19|20)\d{2})$/;

/**
 * Search, plus a guess at what the person meant so the page can lead with it:
 * a band name puts bands (and their shows) first, a date puts shows first,
 * a venue puts venues first, a song title puts tracks first.
 */
export function searchCatalog(c: Catalog, query: string) {
  const q = query.trim().toLowerCase();
  const order: SearchSection[] = ['bands', 'venues', 'tracks', 'shows'];
  if (!q) return { bands: [], venues: [], shows: [], tracks: [], trackTotal: 0, order };
  const words = q.split(/\s+/);
  const hit = (s: string) => words.every((w) => s.includes(w));

  const scoredBands = c.bands
    .map((b) => ({ b, score: Math.max(...bandNames(b).map((n) => nameScore(q, n))) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.b.trackCount - x.b.trackCount);
  const bands = scoredBands.map((x) => x.b);
  const bandScore = scoredBands[0]?.score ?? 0;

  const scoredVenues = c.venues
    .map((v) => {
      const doc = c.venueDocs.get(v.slug);
      const names = [v.name, ...(doc?.aka ?? [])];
      const score = Math.max(...names.map((n) => nameScore(q, n)), hit([v.name, v.city ?? '', ...(doc?.aka ?? [])].join(' ').toLowerCase()) ? 1 : 0);
      return { v, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.v.showCount - x.v.showCount);
  const venues = scoredVenues.map((x) => x.v);
  const venueScore = scoredVenues[0]?.score ?? 0;

  const topBandIds = new Set(scoredBands.filter((x) => x.score === bandScore).map((x) => x.b.id));
  const shows = c.shows
    .filter(
      (s) =>
        (bandScore >= 2 && topBandIds.has(s.bandId)) ||
        hit([s.bandName, s.album, s.venue ?? '', s.title, s.note ?? ''].join(' ').toLowerCase()),
    )
    .sort(byDateDesc);

  const allTracks = c.tracks.filter((t) => hit(c.haystack.get(t.id) ?? ''));
  const titleScore = (t: TrackModel) => nameScore(q, t.title);
  // Best title matches first, then most played.
  allTracks.sort((a, b) => titleScore(b) - titleScore(a) || b.streams - a.streams);
  const trackScore = allTracks.length ? titleScore(allTracks[0]) : 0;

  const isDate = DATE_RE.test(q);
  const score: Record<SearchSection, number> = {
    bands: bands.length ? bandScore + 0.3 : -1, // a band name beats a same-named song
    venues: venues.length ? venueScore + 0.2 : -1,
    shows: shows.length ? (isDate ? 4 : bandScore >= 2 ? bandScore : 0.5) : -1,
    tracks: allTracks.length ? (trackScore || 0.4) : -1,
  };
  // Shows sit right after their band when the search is a band name.
  if (bandScore >= 2 && shows.length) score.shows = score.bands - 0.1;
  order.sort((x, y) => score[y] - score[x]);

  return { bands, venues, shows: shows.slice(0, 24), tracks: allTracks.slice(0, 100), trackTotal: allTracks.length, order };
}

export function sampleTracks(c: Catalog, n: number) {
  const pool = [...c.tracks];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/** Most frequent non-empty value, or null. */
function mostCommon(values: (string | undefined | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [v, c] of counts) if (c > n) [best, n] = [v, c];
  return best;
}
