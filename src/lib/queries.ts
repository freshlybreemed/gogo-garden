import 'server-only';
import { ObjectId, type Document, type WithId } from 'mongodb';
import { getDb } from './db';
import type { ArtistModel, SongDoc, VenueDoc } from './types';

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function toArtist(doc: WithId<Document>): ArtistModel {
  return {
    // Matches the old GraphQL `id: String` coercion of the numeric `id` field.
    id: str(doc.id),
    name: str(doc.name),
    shortName: str(doc.shortName),
    useShortName: Boolean(doc.useShortName),
    image: doc.image ? String(doc.image) : undefined,
  };
}

function toSong(doc: WithId<Document>): SongDoc {
  const oid = doc._id instanceof ObjectId ? doc._id : null;
  const date = str(doc.date);
  return {
    id: doc._id.toString(),
    artistId: str(doc.artistId),
    url: str(doc.url),
    duration: Number(doc.duration) || 0,
    artist: str(doc.artist),
    title: str(doc.title),
    album: str(doc.album),
    imageUrl: str(doc.imageUrl),
    trackNumber: parseInt(str(doc.trackNumber), 10),
    streams: Number(doc.streams) || 0,
    showDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    venue: doc.venue ? String(doc.venue).trim() || null : null,
    venueSlug: doc.venueSlug ? String(doc.venueSlug).trim() || null : null,
    addedAt: (oid ? oid.getTimestamp() : new Date(0)).toISOString(),
    source: doc.source ? String(doc.source) : null,
  };
}

/** Was Query.artists (collection `bands`). */
export async function getArtists(): Promise<ArtistModel[]> {
  const db = await getDb();
  const docs = await db.collection('bands').find().toArray();
  return docs.map(toArtist);
}

/** Was Query.songs (collection `music`). */
export async function getSongs(): Promise<SongDoc[]> {
  const db = await getDb();
  const docs = await db
    .collection('music')
    .find(
      {},
      {
        projection: {
          artistId: 1,
          url: 1,
          duration: 1,
          artist: 1,
          title: 1,
          album: 1,
          imageUrl: 1,
          trackNumber: 1,
          streams: 1,
          date: 1,
          venue: 1,
          venueSlug: 1,
          source: 1,
        },
      },
    )
    .toArray();
  return docs.map(toSong);
}

const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x).trim()).filter(Boolean) : [];
const objs = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object') : [];
const opt = (v: unknown) => (v === null || v === undefined || str(v).trim() === '' ? null : str(v).trim());

/** Venue write-ups (collection `venues`). Missing collection -> []. */
export async function getVenueDocs(): Promise<VenueDoc[]> {
  const db = await getDb();
  const docs = await db.collection('venues').find().toArray();
  return docs
    .filter((d) => d.slug)
    .map((d) => ({
      slug: str(d.slug),
      name: str(d.name),
      aka: strs(d.aka),
      address: opt(d.address),
      city: opt(d.city),
      state: opt(d.state),
      lat: Number.isFinite(Number(d.lat)) && d.lat !== null ? Number(d.lat) : null,
      lng: Number.isFinite(Number(d.lng)) && d.lng !== null ? Number(d.lng) : null,
      yearsActive: Array.isArray(d.years_active) ? d.years_active.map(str).join('–') || null : opt(d.years_active),
      status: opt(d.status),
      now: opt(d.now),
      summary: opt(d.summary),
      history: opt(d.history),
      gogoImpact: opt(d.gogo_impact),
      notableBands: strs(d.notable_bands),
      memories: objs(d.memories)
        .map((m) => ({ quote: str(m.quote).trim(), author: opt(m.author), sourceUrl: opt(m.source_url), date: opt(m.date) }))
        .filter((m) => m.quote),
      photos: objs(d.photos)
        .map((ph) => ({
          url: (str(ph.url).trim() || str(ph.image_url).trim()),
          credit: opt(ph.credit),
          sourceUrl: opt(ph.source_url),
          caption: opt(ph.caption),
          kind: opt(ph.kind),
        }))
        .filter((ph) => /^https?:\/\//.test(ph.url)),
      sources: (Array.isArray(d.sources) ? d.sources : [])
        .map((src: unknown) =>
          typeof src === 'string'
            ? { title: null, url: src }
            : src && typeof src === 'object'
              ? { title: opt((src as Record<string, unknown>).title), url: str((src as Record<string, unknown>).url) }
              : null,
        )
        .filter((src): src is { title: string | null; url: string } => Boolean(src && (src.url || src.title))),
      related: strs(d.related),
      confidence: d.confidence === 'high' || d.confidence === 'medium' || d.confidence === 'low' ? d.confidence : null,
      notes: opt(d.notes),
    }));
}
