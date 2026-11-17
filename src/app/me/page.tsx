import { redirect } from 'next/navigation';
import { getProfileById, profileHref } from '@/lib/profiles';
import { currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** "My profile": send the listener to their own /u/<handle>. */
export default async function MePage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/me');
  const profile = await getProfileById(user.id);
  redirect(profile ? profileHref(profile.handle) : '/account');
}
