'use client';

/* eslint-disable @next/next/no-img-element -- avatar preview is a Supabase Storage URL. */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { handleAvailable, saveProfile, type ProfileInput } from '@/app/account/actions';
import { supabaseBrowser } from '@/lib/supabase/client';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-dust">
      {children}
    </label>
  );
}

const inputCls = 'mt-1 w-full border-b-2 border-rule bg-transparent text-[17px] text-paper outline-none focus:border-crank';

export function ProfileForm({ userId, initial }: { userId: string; initial: ProfileInput }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [handleNote, setHandleNote] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<{ message: string; field?: keyof ProfileInput } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    if (error?.field === key || !error?.field) setError(null);
  };

  // Live "is it free?" check, debounced.
  useEffect(() => {
    const h = form.handle.trim().replace(/^@/, '').toLowerCase();
    if (!h || h === initial.handle) {
      setHandleNote(null);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const res = await handleAvailable(h).catch(() => null);
      if (live && res) setHandleNote(res);
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [form.handle, initial.handle]);

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return setError({ message: 'Use a JPG, PNG or WebP photo.', field: 'avatarUrl' });
    if (file.size > MAX_AVATAR_BYTES) return setError({ message: 'Keep the photo under 5 MB.', field: 'avatarUrl' });
    setUploading(true);
    setError(null);
    try {
      const supabase = supabaseBrowser();
      const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
      const path = `${userId}/avatar/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      set('avatarUrl', supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl);
    } catch (err) {
      console.error('[avatar]', err);
      setError({ message: 'That photo didn’t upload. Try again.', field: 'avatarUrl' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveProfile(form).catch(() => ({ ok: false as const, error: 'Couldn’t save. Try again.' }));
    setSaving(false);
    if (!res.ok) {
      setError({ message: res.error, field: 'field' in res ? res.field : undefined });
      return;
    }
    setSaved(true);
    setForm((f) => ({ ...f, handle: res.handle }));
    router.refresh();
  }

  const fieldError = (f: keyof ProfileInput) =>
    error?.field === f ? (
      <p role="alert" className="mt-1 text-[13px] font-semibold text-crank">
        {error.message}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-7" noValidate>
      <div className="flex items-center gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden bg-tape-2">
          {form.avatarUrl ? <img src={form.avatarUrl} alt="Your photo" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input ref={fileRef} id="avatar" type="file" accept={AVATAR_TYPES.join(',')} className="sr-only" onChange={(e) => onAvatar(e.currentTarget.files?.[0])} />
          <label htmlFor="avatar" className="cursor-pointer border border-paper px-3 py-1.5 text-[13px] font-semibold text-paper hover:bg-paper hover:text-ink">
            {uploading ? 'Uploading…' : form.avatarUrl ? 'Change photo' : 'Add a photo'}
          </label>
          {form.avatarUrl ? (
            <button type="button" onClick={() => set('avatarUrl', null)} className="text-[13px] text-dust underline underline-offset-4 hover:text-paper">
              Remove photo
            </button>
          ) : null}
        </div>
      </div>
      {fieldError('avatarUrl')}

      <div>
        <Label htmlFor="handle">Handle</Label>
        <div className="flex items-center">
          <span className="mt-1 text-[17px] text-dust">@</span>
          <input
            id="handle"
            className={clsx(inputCls, 'h-12')}
            value={form.handle}
            onChange={(e) => set('handle', e.currentTarget.value.replace(/\s/g, '').toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={21}
            aria-describedby="handle-note"
          />
        </div>
        <p id="handle-note" className={clsx('mt-1 text-[13px]', handleNote ? (handleNote.ok ? 'text-leaf-light' : 'text-crank') : 'text-dust')}>
          {handleNote?.message ?? 'Letters, numbers and _. Your page lives at /u/' + (form.handle || 'yourhandle') + '.'}
        </p>
        {fieldError('handle')}
      </div>

      <div>
        <Label htmlFor="displayName">Name</Label>
        <input id="displayName" className={clsx(inputCls, 'h-12')} value={form.displayName} maxLength={60} autoComplete="nickname" onChange={(e) => set('displayName', e.currentTarget.value)} />
        <p className="mt-1 text-[13px] text-dust">Shown on the leaderboard and your page. A nickname is fine.</p>
        {fieldError('displayName')}
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          rows={3}
          maxLength={280}
          className={clsx(inputCls, 'resize-none py-2')}
          placeholder="Where you used to catch the bands, who you crank…"
          value={form.bio}
          onChange={(e) => set('bio', e.currentTarget.value)}
        />
        <p className="mt-1 text-right text-[12px] text-dust tnum">{form.bio.length}/280</p>
        {fieldError('bio')}
      </div>

      {error && !error.field ? (
        <p role="alert" className="text-[14px] font-semibold text-crank">
          {error.message}
        </p>
      ) : null}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving || uploading} className="h-12 bg-crank px-6 text-[16px] font-bold text-ink hover:bg-crank-hot disabled:opacity-60">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {saved ? (
          <p role="status" className="text-[14px] font-semibold text-leaf-light">
            Saved.{' '}
            <a href={`/u/${form.handle}`} className="text-paper underline underline-offset-4">
              See your page
            </a>
          </p>
        ) : null}
      </div>
    </form>
  );
}
