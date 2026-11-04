'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { supabaseBrowser } from '@/lib/supabase/client';
import { finalizeUpload, type UploadInput } from '@/app/upload/actions';

type Band = { id: number; name: string };
type Venue = { slug: string; name: string };
type Row = { file: File; title: string; duration: number; track: number | null; error?: string };

const MAX_TRACKS = 40;
const MAX_BYTES = 50 * 1024 * 1024;
const AUDIO = /\.(mp3|m4a)$/i;
const KINDS = [
  { v: 'live', label: 'Live PA' },
  { v: 'studio', label: 'Studio' },
  { v: 'mixtape', label: 'Mixtape' },
  { v: 'single', label: 'Single(s)' },
] as const;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'track';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9&]/g, '');

async function readTags(file: File): Promise<Pick<Row, 'title' | 'duration' | 'track'>> {
  const fallback = file.name.replace(/\.[^.]+$/, '').replace(/^\d{1,3}[\s._-]+/, '').trim();
  try {
    const { parseBlob } = await import('music-metadata');
    const meta = await parseBlob(file, { duration: true, skipCovers: true });
    return {
      title: meta.common.title?.trim() || fallback,
      duration: Math.round(meta.format.duration ?? 0),
      track: meta.common.track?.no ?? null,
    };
  } catch {
    return { title: fallback, duration: 0, track: null };
  }
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-dust">{children}</label>;
}
const inputCls = 'mt-1 h-11 w-full border-b-2 border-rule bg-transparent text-[16px] text-paper outline-none focus:border-crank';

export function UploadForm({ userId, bands, venues }: { userId: string; bands: Band[]; venues: Venue[] }) {
  const router = useRouter();
  const [bandText, setBandText] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<UploadInput['kind']>('live');
  const [date, setDate] = useState('');
  const [year, setYear] = useState('');
  const [venueText, setVenueText] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const band = useMemo(() => bands.find((b) => norm(b.name) === norm(bandText)), [bands, bandText]);
  const venue = useMemo(() => venues.find((v) => norm(v.name) === norm(venueText)), [venues, venueText]);
  const isNewBand = bandText.trim().length > 0 && !band;

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = [...list].filter((f) => AUDIO.test(f.name));
    const next = await Promise.all(
      picked.map(async (file) => ({
        file,
        ...(await readTags(file)),
        error: file.size > MAX_BYTES ? 'Over 50 MB' : undefined,
      })),
    );
    setRows((cur) =>
      [...cur, ...next]
        .sort((a, b) => (a.track ?? 999) - (b.track ?? 999) || a.file.name.localeCompare(b.file.name))
        .slice(0, MAX_TRACKS),
    );
    setError(picked.length < list.length ? 'Only MP3 and M4A files are allowed; others were skipped.' : '');
  }

  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!bandText.trim()) return setError('Pick a band, or type a new band name.');
    if (!title.trim()) return setError('Name the album or show.');
    if (!rows.length) return setError('Add at least one MP3.');
    if (rows.some((r) => r.error)) return setError('Remove the files marked in red first.');
    if (!attest) return setError('Check the box to confirm you can share these.');

    setBusy(true);
    const supabase = supabaseBrowser();
    const uploadId = crypto.randomUUID();
    const folder = `${userId}/${uploadId}`;
    try {
      const tracks: UploadInput['tracks'] = [];
      for (const [i, r] of rows.entries()) {
        setProgress(`Uploading ${i + 1} of ${rows.length}: ${r.title}`);
        const ext = r.file.name.match(/\.(mp3|m4a)$/i)?.[1].toLowerCase() ?? 'mp3';
        const path = `${folder}/${String(i + 1).padStart(2, '0')}-${slug(r.title)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('uploads')
          .upload(path, r.file, { contentType: ext === 'm4a' ? 'audio/mp4' : 'audio/mpeg', upsert: false });
        if (upErr) throw new Error(`“${r.title}” didn’t upload: ${upErr.message}`);
        tracks.push({ path, title: r.title, position: i + 1, duration: r.duration });
      }
      let coverPath: string | null = null;
      if (cover) {
        setProgress('Uploading cover…');
        const ext = cover.type === 'image/png' ? 'png' : cover.type === 'image/webp' ? 'webp' : 'jpg';
        coverPath = `${folder}/cover.${ext}`;
        const { error: cErr } = await supabase.storage.from('uploads').upload(coverPath, cover, { contentType: cover.type });
        if (cErr) coverPath = null;
      }
      setProgress('Putting it in the garden…');
      const res = await finalizeUpload({
        uploadId,
        bandId: band?.id ?? null,
        newBandName: band ? null : bandText.trim(),
        title: title.trim(),
        kind,
        showDate: kind === 'live' && date ? date : null,
        year: kind !== 'live' && /^\d{4}$/.test(year) ? year : null,
        venueSlug: venue?.slug ?? null,
        venueText: venue ? null : venueText.trim() || null,
        coverPath,
        tracks,
        attest,
      });
      if (!res.ok) throw new Error(res.error);
      router.push(`/bands/${res.bandId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 grid max-w-3xl gap-8" noValidate>
      <section className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="band">Band</Label>
          <input id="band" list="band-list" value={bandText} onChange={(e) => setBandText(e.currentTarget.value)} placeholder="Start typing: Reaction Band, TCB…" className={inputCls} autoComplete="off" />
          <datalist id="band-list">{bands.map((b) => <option key={b.id} value={b.name} />)}</datalist>
          {isNewBand ? (
            <p className="mt-2 text-[13px] text-leaf-light">New band: “{bandText.trim()}” will be added. Check the list first so it isn’t a repeat.</p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title">Album or show name</Label>
          <input id="title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} maxLength={160} placeholder="e.g. 3-30-11 @ Gee's, or Live PA the Leak Pt. 5" className={inputCls} />
        </div>
        <fieldset className="sm:col-span-2">
          <legend className="text-[13px] font-semibold text-dust">Type</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <label key={k.v} className={clsx('cursor-pointer border px-3 py-2 text-[14px] font-semibold', kind === k.v ? 'border-crank text-paper' : 'border-rule text-dust')}>
                <input type="radio" name="kind" value={k.v} checked={kind === k.v} onChange={() => setKind(k.v)} className="sr-only" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>
        {kind === 'live' ? (
          <>
            <div>
              <Label htmlFor="date">Show date (if you know it)</Label>
              <input id="date" type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} className={inputCls} />
            </div>
            <div>
              <Label htmlFor="venue">Venue</Label>
              <input id="venue" list="venue-list" value={venueText} onChange={(e) => setVenueText(e.currentTarget.value)} placeholder="Gee's, Le Pearl, The CFE…" className={inputCls} autoComplete="off" />
              <datalist id="venue-list">{venues.map((v) => <option key={v.slug} value={v.name} />)}</datalist>
            </div>
          </>
        ) : (
          <div>
            <Label htmlFor="year">Year</Label>
            <input id="year" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.currentTarget.value.replace(/\D/g, ''))} placeholder="2024" className={inputCls} />
          </div>
        )}
        <div>
          <Label htmlFor="cover">Cover image (optional)</Label>
          <input id="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCover(e.currentTarget.files?.[0] ?? null)} className="mt-2 block text-[14px] text-dust" />
        </div>
      </section>

      <section>
        <Label htmlFor="files">MP3s ({rows.length}/{MAX_TRACKS})</Label>
        <label htmlFor="files" className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-rule p-6 text-center hover:border-crank">
          <span className="poster text-[28px]">Drop the tape here</span>
          <span className="mt-1 text-[13px] text-dust">MP3 or M4A, up to 50 MB each. Titles and order come from the files; fix them below.</span>
          <input id="files" type="file" accept=".mp3,.m4a,audio/mpeg,audio/mp4" multiple onChange={(e) => { void addFiles(e.currentTarget.files); e.currentTarget.value = ''; }} className="sr-only" />
        </label>
        {rows.length ? (
          <ol className="mt-4 border-t border-rule">
            {rows.map((r, i) => (
              <li key={`${r.file.name}-${i}`} className={clsx('grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-rule py-1.5', r.error && 'bg-crank/10')}>
                <span className="text-center text-[13px] text-dust tnum">{i + 1}</span>
                <span className="min-w-0">
                  <input value={r.title} aria-label={`Title for track ${i + 1}`} onChange={(e) => { const v = e.currentTarget.value; setRows((cur) => cur.map((x, j) => (j === i ? { ...x, title: v } : x))); }} className="h-9 w-full bg-transparent text-[15px] text-paper outline-none focus:border-b focus:border-crank" />
                  <span className="block truncate text-[12px] text-dust">{r.error ?? r.file.name}{r.duration ? ` · ${Math.floor(r.duration / 60)}:${String(r.duration % 60).padStart(2, '0')}` : ''}</span>
                </span>
                <span className="flex text-[13px] font-semibold text-dust">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="h-9 w-8 hover:text-paper">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="h-9 w-8 hover:text-paper">↓</button>
                  <button type="button" onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))} aria-label="Remove" className="h-9 px-2 hover:text-crank">✕</button>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="border-l-[3px] border-rule pl-4 text-[14px] text-paper/85">
        <p className="font-semibold text-paper">House rules</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Go-go only: PA tapes, studio cuts, mixtapes.</li>
          <li>Up to {MAX_TRACKS} tracks per upload, 50 MB per file, 5 uploads a day.</li>
          <li>Right band, real titles where you know them. No duplicates of what’s already here.</li>
          <li>Uploads go live right away and can be taken down if they break the rules.</li>
        </ul>
        <label className="mt-4 flex items-start gap-3 text-paper">
          <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.currentTarget.checked)} className="mt-1 h-4 w-4 accent-[#ff5a1f]" />
          <span>I recorded these, or the band or recordist is cool with them being shared here.</span>
        </label>
      </section>

      <div>
        <p role="alert" className="min-h-[1.5em] text-[14px] font-semibold text-crank">{error}</p>
        {progress ? <p role="status" className="text-[14px] text-dust">{progress}</p> : null}
        <button type="submit" disabled={busy} className="mt-2 h-12 bg-crank px-6 text-[16px] font-bold text-ink hover:bg-crank-hot disabled:opacity-60">
          {busy ? 'Uploading…' : 'Put it in the garden'}
        </button>
      </div>
    </form>
  );
}
