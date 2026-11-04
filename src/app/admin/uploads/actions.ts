'use server';

import { isAdmin } from '@/lib/admin';
import { invalidateCatalog } from '@/lib/catalog';
import { getDb } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';

async function requireAdmin() {
  const user = await currentUser();
  if (!isAdmin(user)) throw new Error('Not allowed');
}

/** Hide or restore an upload everywhere (catalog, Supabase tracks). Files stay in Storage. */
export async function setUploadHidden(uploadId: string, hidden: boolean) {
  await requireAdmin();
  const admin = supabaseAdmin();
  await admin.from('uploads').update({ status: hidden ? 'hidden' : 'live' }).eq('id', uploadId);
  await admin.from('tracks').update({ hidden }).eq('upload_id', uploadId);
  await (await getDb()).collection('music').updateMany({ uploadId }, { $set: { hidden } });
  invalidateCatalog();
}

/** Remove an upload for good: catalog rows and the files. */
export async function deleteUpload(uploadId: string) {
  await requireAdmin();
  const admin = supabaseAdmin();
  const { data: up } = await admin.from('uploads').select('user_id, show_id').eq('id', uploadId).maybeSingle();
  if (!up) return;
  await (await getDb()).collection('music').deleteMany({ uploadId });
  await admin.from('tracks').delete().eq('upload_id', uploadId);
  if (up.show_id) {
    const { count } = await admin.from('tracks').select('id', { count: 'exact', head: true }).eq('show_id', up.show_id);
    if (!count) await admin.from('shows').delete().eq('id', up.show_id);
  }
  const folder = `${up.user_id}/${uploadId}`;
  const { data: files } = await admin.storage.from('uploads').list(folder, { limit: 100 });
  if (files?.length) await admin.storage.from('uploads').remove(files.map((f) => `${folder}/${f.name}`));
  await admin.from('uploads').delete().eq('id', uploadId);
  invalidateCatalog();
}
