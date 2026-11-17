'use server';

import { revalidatePath } from 'next/cache';
import { invalidateLeaderboards } from '@/lib/leaderboard';
import { checkHandle, getProfileById, isOwnAvatarUrl } from '@/lib/profiles';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentUser } from '@/lib/supabase/server';

export type ProfileInput = { handle: string; displayName: string; bio: string; avatarUrl: string | null };
export type ProfileResult = { ok: true; handle: string } | { ok: false; error: string; field?: keyof ProfileInput };

/** Is this handle free? (For the live check while typing; save checks again.) */
export async function handleAvailable(raw: string): Promise<{ ok: boolean; message: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, message: 'Log in first.' };
  const checked = checkHandle(raw);
  if ('error' in checked) return { ok: false, message: checked.error };
  const { data } = await supabaseAdmin().from('profiles').select('id').eq('handle', checked.handle).maybeSingle();
  if (data && data.id !== user.id) return { ok: false, message: `@${checked.handle} is taken.` };
  return { ok: true, message: data ? 'That’s you.' : `@${checked.handle} is yours if you want it.` };
}

/** Save the signed-in listener's profile. Profiles can only be written here (the browser can't update them). */
export async function saveProfile(input: ProfileInput): Promise<ProfileResult> {
  const user = await currentUser();
  if (!user) return { ok: false, error: 'Log in to edit your profile.' };

  const checked = checkHandle(input.handle);
  if ('error' in checked) return { ok: false, error: checked.error, field: 'handle' };
  const displayName = String(input.displayName ?? '').replace(/\s+/g, ' ').trim();
  if (!displayName) return { ok: false, error: 'Add a name people will see.', field: 'displayName' };
  if (displayName.length > 60) return { ok: false, error: 'Keep your name to 60 characters.', field: 'displayName' };
  const bio = String(input.bio ?? '').trim();
  if (bio.length > 280) return { ok: false, error: 'Keep your bio to 280 characters.', field: 'bio' };
  const avatarUrl = input.avatarUrl ? String(input.avatarUrl) : null;
  if (avatarUrl && !isOwnAvatarUrl(avatarUrl, user.id)) return { ok: false, error: 'Upload the photo here.', field: 'avatarUrl' };

  const before = await getProfileById(user.id);
  const { error } = await supabaseAdmin()
    .from('profiles')
    .update({ handle: checked.handle, display_name: displayName, bio: bio || null, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) {
    if (error.code === '23505') return { ok: false, error: `@${checked.handle} is taken.`, field: 'handle' };
    console.error('[saveProfile]', error);
    return { ok: false, error: 'Couldn’t save. Try again.' };
  }

  invalidateLeaderboards();
  revalidatePath('/leaderboard');
  if (before) revalidatePath(`/u/${before.handle}`);
  revalidatePath(`/u/${checked.handle}`);
  return { ok: true, handle: checked.handle };
}
