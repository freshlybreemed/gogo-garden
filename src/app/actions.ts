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

/** Was Mutation.login: stamp lastModified on the user doc by email. */
export async function recordLogin(email: string): Promise<MutationResult> {
  if (typeof email !== 'string' || !email) return { result: 'Unsucessful' };
  try {
    const db = await getDb();
    await db
      .collection('user')
      .updateOne({ email }, { $set: { lastModified: new Date() } });
    return { result: 'Login successful' };
  } catch (err) {
    console.error(`Something went wrong: ${err}`);
    return { result: 'Unsucessful' };
  }
}

export type SignupInput = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
};

/**
 * Was Mutation.signup. Only whitelisted fields are stored. The old client also
 * sent the plaintext password, which was written to Mongo; Firebase owns the
 * credential, so it is intentionally no longer persisted.
 */
export async function recordSignup(input: SignupInput): Promise<MutationResult> {
  if (!input || typeof input._id !== 'string' || typeof input.email !== 'string') {
    return { result: 'Unsucessful' };
  }
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  try {
    const db = await getDb();
    await db.collection<SignupInput & { lastModified: Date }>('user').insertOne({
      _id: input._id,
      email: input.email,
      firstName: s(input.firstName),
      lastName: s(input.lastName),
      phoneNumber: s(input.phoneNumber),
      lastModified: new Date(),
    });
    return { result: 'Successfully entered into database' };
  } catch (err) {
    console.error(`Something went wrong: ${err}`);
    return { result: 'Unsucessful' };
  }
}
