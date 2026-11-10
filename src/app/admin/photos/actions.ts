'use server';

import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/admin';
import { getCatalog, invalidateCatalog } from '@/lib/catalog';
import { getDb } from '@/lib/db';
import { EditError, applyEdits } from '@/lib/edits';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';

export type PhotoResult = { ok: true } | { ok: false; error: string };

/**
 * Approve a drafted photo: copy it into our storage (so a dead YouTube/press link can't break it),
 * then add it to the band's photos, or make it the main photo. Logged like any edit.
 */
export async function decidePhoto(id: string, decision: 'approve' | 'main' | 'skip'): Promise<PhotoResult> {
  try {
    const user = await currentUser();
    if (!user || !isAdmin(user)) throw new EditError('Not allowed.');
    if (!ObjectId.isValid(id)) throw new EditError('Unknown photo.');
    const coll = (await getDb()).collection('photoCandidates');
    const cand = await coll.findOne({ _id: new ObjectId(id) });
    if (!cand) throw new EditError('Unknown photo.');
    if (decision === 'skip') {
      await coll.updateOne({ _id: cand._id }, { $set: { status: 'skipped', decidedAt: new Date(), decidedBy: user.email } });
      revalidatePath('/admin/photos');
      return { ok: true };
    }

    const res = await fetch(String(cand.imageUrl), { headers: { 'User-Agent': 'Mozilla/5.0 GoGoGarden' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) throw new EditError(`Couldn’t fetch that image (${res.status}).`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length < 4000) throw new EditError('That image is too small to use.');
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const path = `admin/band-photos/${cand.bandId}-${createHash('sha1').update(bytes).digest('hex').slice(0, 16)}.${ext}`;
    const sb = supabaseAdmin();
    const { error } = await sb.storage.from('uploads').upload(path, bytes, { contentType: type, upsert: true });
    if (error) throw new EditError(`Storage: ${error.message}`);
    const url = sb.storage.from('uploads').getPublicUrl(path).data.publicUrl;

    const band = (await getCatalog()).bandById.get(String(cand.bandId));
    if (!band) throw new EditError('That band isn’t in the catalog anymore.');
    const href = `/bands/${encodeURIComponent(band.id)}`;
    const extras = band.photos.filter((p) => p !== band.image);
    const changes =
      decision === 'main'
        ? { image: url, photos: band.image ? [...new Set([band.image, ...extras])] : extras }
        : { photos: [...new Set([...extras, url])] };
    await applyEdits(user, 'band', band.id, changes, { label: band.name, href });
    await coll.updateOne(
      { _id: cand._id },
      { $set: { status: decision === 'main' ? 'main' : 'approved', storedUrl: url, decidedAt: new Date(), decidedBy: user.email } },
    );
    invalidateCatalog();
    revalidatePath('/admin/photos');
    revalidatePath(href);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof EditError ? e.message : 'Something went wrong.' };
  }
}
