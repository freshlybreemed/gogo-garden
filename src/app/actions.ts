'use server';

import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { bumpCachedStream, getCatalog, sampleTracks } from '@/lib/catalog';
import type { TrackModel } from '@/lib/types';

type MutationResult = { result: string };

/** Was Mutation.streamUp: +1 stream and bump lastModified. */
export async function streamUp(songId: string): Promise<MutationResult> {
  if (typeof songId !== 'string' || !ObjectId.isValid(songId)) {
    return { result: 'Unsucessful' };
  }
  try {
    const db = await getDb();
    await db
      .collection('music')
      .updateOne(
        { _id: new ObjectId(songId) },
        { $inc: { streams: 1 }, $set: { lastModified: new Date() } },
      );
    await bumpCachedStream(songId);
    return { result: 'Stream incremented' };
  } catch (err) {
    console.error(`Something went wrong: ${err}`);
    return { result: 'Unsucessful' };
  }
}

/** "Dig in the crates": a random run of tracks from across the whole library. */
export async function digCrates(count = 40): Promise<TrackModel[]> {
  const n = Math.min(Math.max(Math.floor(Number(count)) || 40, 1), 100);
  const catalog = await getCatalog();
  return sampleTracks(catalog, n);
}

