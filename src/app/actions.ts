'use server';

import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { bumpCachedStream, getCatalog, sampleTracks } from '@/lib/catalog';
import type { TrackModel } from '@/lib/types';
import { supabaseServer } from '@/lib/supabase/server';

type MutationResult = { result: string };

/** Mirror the stream into Supabase (tracks.streams + a plays row for the listener). */
async function recordSupabaseStream(audioUrl: string) {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.from('tracks').select('id').eq('audio_url', audioUrl).maybeSingle();
    if (data) await supabase.rpc('record_stream', { p_track_id: data.id });
  } catch (err) {
    console.error('[streamUp] supabase', err);
  }
}

/** Was Mutation.streamUp: +1 stream and bump lastModified. */
export async function streamUp(songId: string): Promise<MutationResult> {
  if (typeof songId !== 'string' || !ObjectId.isValid(songId)) {
    return { result: 'Unsucessful' };
  }
  try {
    const db = await getDb();
    const song = await db
      .collection('music')
      .findOneAndUpdate(
        { _id: new ObjectId(songId) },
        { $inc: { streams: 1 }, $set: { lastModified: new Date() } },
        { projection: { url: 1 } },
      );
    await bumpCachedStream(songId);
    if (song?.url) await recordSupabaseStream(String(song.url));
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

