'use server';

import { getDb } from '@/lib/db';
import { alertOwner } from '@/lib/alert';
import { invalidateCatalog } from '@/lib/catalog';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';

const MAX_TRACKS = 40;
const MAX_BYTES = 50 * 1024 * 1024;
const KINDS = ['live', 'studio', 'mixtape', 'single'] as const;
type Kind = (typeof KINDS)[number];

export type UploadTrackInput = { path: string; title: string; position: number; duration: number };
export type UploadInput = {
  uploadId: string;
  bandId: number | null;
  newBandName: string | null;
  title: string;
  kind: Kind;
  showDate: string | null; // YYYY-MM-DD
  year: string | null; // YYYY
  venueSlug: string | null;
  venueText: string | null;
  coverPath: string | null;
  tracks: UploadTrackInput[];
  attest: boolean;
};
export type UploadResult = { ok: true; bandId: number; uploadId: string } | { ok: false; error: string };

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9&]/g, '');
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const publicUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/uploads/${path.split('/').map(encodeURIComponent).join('/')}`;

export async function finalizeUpload(input: UploadInput): Promise<UploadResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: 'Log in to upload.' };
  if (!input?.attest) return { ok: false, error: 'Confirm you have the right to share these recordings.' };
  if (!/^[0-9a-f-]{36}$/i.test(input.uploadId)) return { ok: false, error: 'Bad upload id.' };
  if (!KINDS.includes(input.kind)) return { ok: false, error: 'Pick a type.' };

  const title = clean(input.title, 160);
  if (!title) return { ok: false, error: 'Give the album or show a name.' };
  const tracks = (input.tracks ?? []).slice(0, MAX_TRACKS + 1);
  if (!tracks.length) return { ok: false, error: 'Add at least one track.' };
  if (tracks.length > MAX_TRACKS) return { ok: false, error: `Up to ${MAX_TRACKS} tracks per upload.` };
  const showDate = /^\d{4}-\d{2}-\d{2}$/.test(input.showDate ?? '') ? input.showDate : null;
  const year = showDate?.slice(0, 4) ?? (/^\d{4}$/.test(input.year ?? '') ? input.year : null);

  // Every file must already be in Storage, inside this user's folder for this upload, and within limits.
  const admin = supabaseAdmin();
  const folder = `${user.id}/${input.uploadId}`;
  const { data: listed, error: listErr } = await admin.storage.from('uploads').list(folder, { limit: 100 });
  if (listErr) return { ok: false, error: 'Couldn’t read your files. Try again.' };
  const stored = new Map((listed ?? []).map((f) => [`${folder}/${f.name}`, Number(f.metadata?.size ?? 0)]));
  for (const t of tracks) {
    if (!stored.has(t.path)) return { ok: false, error: `Missing file for “${clean(t.title, 60)}”. Upload it again.` };
    if ((stored.get(t.path) ?? 0) > MAX_BYTES) return { ok: false, error: 'Files can be up to 50 MB each.' };
  }
  const coverPath = input.coverPath && stored.has(input.coverPath) ? input.coverPath : null;

  // Band: an existing one, or a new name that doesn't collide with an existing band (or its short name).
  const db = await getDb();
  const bands = db.collection('bands');
  const all = await bands.find({}, { projection: { id: 1, name: 1, shortName: 1 } }).toArray();
  let band = input.bandId !== null ? all.find((b) => Number(b.id) === Number(input.bandId)) : undefined;
  let createdBand = false;
  if (!band) {
    const name = clean(input.newBandName, 80);
    if (!name) return { ok: false, error: 'Pick a band or type a new band name.' };
    band = all.find((b) => key(String(b.name)) === key(name) || (b.shortName && key(String(b.shortName)) === key(name)));
    if (!band) {
      const id = Math.max(...all.map((b) => Number(b.id) || 0)) + 1;
      const doc = { id, name, shortName: name, useShortName: false, image: '', description: '', bio: '', founded: '',
        instagram: '', twitter: '', youtube: '', createdBy: user.id, createdAt: new Date() };
      await bands.insertOne(doc);
      await admin.from('bands').insert({ id, name, short_name: name, use_short_name: false });
      band = { _id: doc.id as never, id, name };
      createdBand = true;
    }
  }
  const bandId = Number(band.id);
  const bandName = String(band.name);

  // Venue: a known one by slug, else free text.
  let venueSlug: string | null = null;
  let venueName: string | null = null;
  if (input.venueSlug) {
    const { data: v } = await admin.from('venues').select('slug, name').eq('slug', input.venueSlug).maybeSingle();
    if (v) [venueSlug, venueName] = [v.slug as string, v.name as string];
  }
  const venueText = venueSlug ? null : clean(input.venueText, 120) || null;
  venueName ??= venueText;
  const album = input.kind === 'single' ? 'Singles' : title;
  const coverUrl = coverPath ? publicUrl(coverPath) : '';

  // The upload row (the database enforces 5 per day).
  const { error: upErr } = await admin.from('uploads').insert({
    id: input.uploadId, user_id: user.id, band_id: bandId, new_band_name: createdBand ? bandName : null, title,
    kind: input.kind, show_date: showDate, venue_slug: venueSlug, venue_text: venueText, cover_path: coverPath,
    track_count: tracks.length,
  });
  if (upErr) {
    return { ok: false, error: /limit/i.test(upErr.message) ? 'You’ve hit the limit of 5 uploads a day. Try tomorrow.' : 'Couldn’t save the upload.' };
  }

  // Catalog rows: Mongo (what the app reads today) and Supabase (where it's moving).
  const now = new Date();
  const docs = tracks
    .sort((a, b) => a.position - b.position)
    .map((t, i) => ({
      album, artist: bandName, artistId: bandId, title: clean(t.title, 160) || `Track ${i + 1}`,
      trackNumber: i + 1, duration: Math.max(0, Math.round(Number(t.duration) || 0)), url: publicUrl(t.path),
      imageUrl: coverUrl, date: showDate, year: year ? Number(year) : null, venue: venueName, venueSlug,
      streams: 0, lastModified: now, source: 'user-upload', uploadId: input.uploadId, uploaderId: user.id,
    }));
  await db.collection('music').insertMany(docs);

  const { data: show } = await admin
    .from('shows')
    .upsert(
      { band_id: bandId, label: album, kind: input.kind === 'live' ? 'live' : 'tape', show_date: showDate,
        venue_slug: venueSlug, venue_raw: venueName, image_url: coverUrl || null, upload_id: input.uploadId },
      { onConflict: 'band_id,label' },
    )
    .select('id')
    .single();
  if (show) {
    await admin.from('tracks').insert(
      docs.map((d) => ({ show_id: show.id, band_id: bandId, title: d.title, position: d.trackNumber, duration: d.duration,
        audio_url: d.url, image_url: d.imageUrl || null, source: 'user-upload', upload_id: input.uploadId })),
    );
    await admin.from('uploads').update({ show_id: show.id }).eq('id', input.uploadId);
  }

  invalidateCatalog();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thegogogarden.com';
  await alertOwner(`New upload: ${bandName} – ${title}`, [
    `${tracks.length} track${tracks.length === 1 ? '' : 's'} · ${input.kind}${showDate ? ` · ${showDate}` : year ? ` · ${year}` : ''}${venueName ? ` · ${venueName}` : ''}`,
    `By ${user.email ?? user.id}${createdBand ? ` · NEW BAND “${bandName}”` : ''}`,
    `Review: ${site}/admin/uploads`,
  ]);
  return { ok: true, bandId, uploadId: input.uploadId };
}
