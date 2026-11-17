'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveBandAbout } from '@/app/edit/actions';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { BandMember } from '@/lib/types';

const blank = (): BandMember => ({ name: '', role: null, years: null, social: null });
const input = 'w-full border border-rule bg-transparent px-2.5 py-1.5 text-[15px] text-paper focus:border-paper focus:outline-none';

/** Edit a band's bio, start year and members. Every change is logged. */
export function AboutEditor({
  bandId,
  bandName,
  bio,
  founded,
  members,
  image,
  photos,
  signedIn,
}: {
  bandId: string;
  bandName: string;
  bio: string | null;
  founded: string | null;
  members: BandMember[];
  image: string | null;
  /** The band's whole photo pool, main first. */
  photos: string[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bio: bio ?? '',
    founded: founded ?? '',
    members: members.length ? members : [blank()],
    image: image ?? '',
    photos: photos.filter((p) => p !== image),
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState('');

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setMsg({ ok: false, text: 'Log in to add photos.' });
    const added: string[] = [];
    for (const [i, file] of [...files].slice(0, 12).entries()) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) continue;
      if (file.size > 15 * 1024 * 1024) continue;
      setUploading(`Uploading photo ${i + 1} of ${Math.min(files.length, 12)}…`);
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${data.user.id}/band-photos/${bandId}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type });
      if (error) {
        setMsg({ ok: false, text: `A photo didn’t upload: ${error.message}` });
        continue;
      }
      added.push(supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl);
    }
    setUploading('');
    if (added.length) {
      setForm((f) => ({ ...f, photos: [...f.photos, ...added] }));
      setMsg({ ok: true, text: `Added ${added.length} photo${added.length === 1 ? '' : 's'}. Hit Save to keep them.` });
    }
  }

  const [pending, start] = useTransition();
  const empty = !bio && !members.length;
  const href = `/bands/${encodeURIComponent(bandId)}`;

  if (!signedIn) {
    return (
      <p className="mt-3 text-[13px] text-dust">
        {empty ? `Know ${bandName}? ` : 'Know someone missing? '}
        <Link href={`/login?next=${encodeURIComponent(href)}`} className="font-semibold text-paper underline underline-offset-4">
          Log in to add members and history
        </Link>
        .
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-4 border border-rule px-3 py-1.5 text-[13px] font-semibold text-paper hover:bg-tape">
        {empty ? `Add ${bandName}’s members and history` : 'Edit members and history'}
      </button>
    );
  }

  const setMember = (i: number, patch: Partial<BandMember>) =>
    setForm((f) => ({ ...f, members: f.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  return (
    <form
      className="mt-5 max-w-[46rem] border border-rule p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const res = await saveBandAbout(bandId, { ...form, members: form.members.filter((m) => m.name.trim()) });
          if (res.ok) {
            setMsg({ ok: true, text: res.changed ? 'Saved. Thanks!' : 'Nothing changed.' });
            if (res.changed) setOpen(false);
          } else setMsg({ ok: false, text: res.error });
        });
      }}
    >
      <h3 className="font-display text-[18px] font-extrabold uppercase">{bandName}: members and history</h3>
      <p className="mt-1 text-[13px] text-dust">Changes go live right away and are logged, so mistakes can be undone.</p>

      <label className="mt-4 block text-[13px] font-semibold text-dust">
        Bio
        <textarea value={form.bio} maxLength={3000} rows={5} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className={`${input} mt-1`} />
      </label>
      <label className="mt-3 block max-w-[16rem] text-[13px] font-semibold text-dust">
        Started (year)
        <input value={form.founded} maxLength={40} onChange={(e) => setForm((f) => ({ ...f, founded: e.target.value }))} className={`${input} mt-1`} />
      </label>

      <label className="mt-3 block max-w-[30rem] text-[13px] font-semibold text-dust">
        Main photo (link)
        <input value={form.image} maxLength={500} placeholder="https://…" onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className={`${input} mt-1`} />
      </label>

      <fieldset className="mt-4">
        <legend className="text-[13px] font-semibold text-dust">More photos ({form.photos.length})</legend>
        <p className="mt-0.5 text-[12.5px] text-dust">Tapes without a cover borrow these, and band cards rotate through them. Shows, flyers, the band on stage.</p>
        {form.photos.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {form.photos.map((u) => (
              <li key={u} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary photo hosts */}
                <img src={u} alt="" referrerPolicy="no-referrer" className="h-20 w-20 border border-rule object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setForm((f) => ({ ...f, photos: f.photos.filter((p) => p !== u) }))}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-ink text-[12px] text-paper ring-1 ring-rule hover:bg-crank hover:text-ink"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer border border-rule px-3 py-2 text-[13px] font-semibold text-paper hover:bg-tape">
            Upload photos
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { void uploadPhotos(e.currentTarget.files); e.currentTarget.value = ''; }} />
          </label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="or paste an image link" className={`${input} max-w-[18rem]`} />
          <button
            type="button"
            onClick={() => {
              const u = link.trim();
              if (!/^https:\/\/\S+$/.test(u)) return setMsg({ ok: false, text: 'Paste an https image link.' });
              setForm((f) => ({ ...f, photos: [...new Set([...f.photos, u])] }));
              setLink('');
            }}
            className="px-2 text-[13px] font-semibold text-paper underline underline-offset-4"
          >
            Add link
          </button>
          {uploading ? <span className="text-[13px] text-dust">{uploading}</span> : null}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-[13px] font-semibold text-dust">Members</legend>
        <div className="mt-1 space-y-2">
          {form.members.map((m, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,.7fr)_minmax(0,1fr)_auto]">
              <input placeholder="Name" aria-label="Member name" value={m.name} maxLength={80} onChange={(e) => setMember(i, { name: e.target.value })} className={input} />
              <input placeholder="Role (lead talker, keys…)" aria-label="Role" value={m.role ?? ''} maxLength={60} onChange={(e) => setMember(i, { role: e.target.value || null })} className={input} />
              <input placeholder="Years" aria-label="Years" value={m.years ?? ''} maxLength={40} onChange={(e) => setMember(i, { years: e.target.value || null })} className={input} />
              <input placeholder="@instagram or link" aria-label="Social" value={m.social ?? ''} maxLength={200} onChange={(e) => setMember(i, { social: e.target.value || null })} className={input} />
              <button
                type="button"
                aria-label={`Remove ${m.name || 'member'}`}
                onClick={() => setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }))}
                className="px-2 text-dust hover:text-paper"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setForm((f) => ({ ...f, members: [...f.members, blank()] }))} className="mt-2 text-[13px] font-semibold text-paper underline underline-offset-4">
          + Add member
        </button>
      </fieldset>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={pending} className="bg-paper px-4 py-2 text-[14px] font-semibold text-ink disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-dust hover:text-paper">
          Cancel
        </button>
        {msg ? <span className={msg.ok ? 'text-[13px] text-leaf-light' : 'text-[13px] text-[#f08a7a]'}>{msg.text}</span> : null}
      </div>
    </form>
  );
}
