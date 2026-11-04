import 'server-only';
import type { Document, WithId } from 'mongodb';
import { getDb } from './db';
import type { ArtistModel, TrackModel } from './types';

function toIso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

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

function toTrack(doc: WithId<Document>): TrackModel {
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
    date: toIso(doc.lastModified),
    lastModified: toIso(doc.lastModified),
  };
}

/** Was Query.artists (collection `bands`). */
export async function getArtists(): Promise<ArtistModel[]> {
  const db = await getDb();
  const docs = await db.collection('bands').find().toArray();
  return docs.map(toArtist);
}

/** Was Query.songs (collection `music`). */
export async function getSongs(): Promise<TrackModel[]> {
  const db = await getDb();
  const docs = await db.collection('music').find().toArray();
  return docs.map(toTrack);
}
