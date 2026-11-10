'use server';

import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin';
import { getCatalog, invalidateCatalog } from '@/lib/catalog';
import { EditError, applyEdits, revertEdit as revert } from '@/lib/edits';
import { trackTitle } from '@/lib/shows';
import { currentUser } from '@/lib/supabase/server';
import type { BandMember } from '@/lib/types';

export type EditResult = { ok: true; changed: number } | { ok: false; error: string };

async function run(fn: () => Promise<number>, paths: string[]): Promise<EditResult> {
  try {
    const changed = await fn();
    if (changed) {
      invalidateCatalog();
      for (const p of paths) revalidatePath(p);
    }
    return { ok: true, changed };
  } catch (e) {
    return { ok: false, error: e instanceof EditError ? e.message : 'Something went wrong saving that.' };
  }
}

async function signedIn() {
  const user = await currentUser();
  if (!user) throw new EditError('Log in to make changes.');
  return user;
}

/** Rename tracks on one show. `titles` maps track id -> new title. */
export async function saveTrackTitles(showHref: string, titles: Record<string, string>): Promise<EditResult> {
  return run(async () => {
    const user = await signedIn();
    const catalog = await getCatalog();
    const tracks = catalog.tracksByShow.get(showHref) ?? [];
    const show = catalog.shows.find((s) => s.href === showHref);
    if (!show) throw new EditError('Unknown show.');
    let changed = 0;
    for (const [id, title] of Object.entries(titles)) {
      const track = tracks.find((t) => t.id === id);
      if (!track) continue; // only tracks on this show
      changed += await applyEdits(
        user,
        'track',
        id,
        { title },
        { label: `${show.bandName} / ${show.album}: ${trackTitle(track)}`, href: showHref },
      );
    }
    return changed;
  }, [showHref, '/']);
}

/** Name one track (the per-song pencil). */
export async function renameTrack(showHref: string, trackId: string, title: string): Promise<EditResult> {
  return saveTrackTitles(showHref, { [trackId]: title });
}

/** Update a band's bio, start year and members. */
export async function saveBandAbout(
  bandId: string,
  about: { bio: string; founded: string; members: BandMember[] },
): Promise<EditResult> {
  const href = `/bands/${encodeURIComponent(bandId)}`;
  return run(async () => {
    const user = await signedIn();
    const band = (await getCatalog()).bandById.get(bandId);
    if (!band) throw new EditError('Unknown band.');
    return applyEdits(user, 'band', bandId, about, { label: band.name, href });
  }, [href]);
}

/** Admin: undo one logged change. */
export async function revertEdit(editId: string, href: string | null): Promise<EditResult> {
  return run(async () => {
    const user = await currentUser();
    if (!user || !isAdmin(user)) throw new EditError('Not allowed.');
    await revert(user, editId);
    return 1;
  }, ['/admin/edits', ...(href ? [href] : [])]);
}
