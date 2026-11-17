import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ProfileForm } from '@/components/account/ProfileForm';
import { getProfileById, profileHref } from '@/lib/profiles';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Your profile' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/account');
  const profile = await getProfileById(user.id);

  return (
    <div className="mx-auto max-w-[36rem] px-4 pt-5 md:pt-10">
      <h1 className="poster text-[clamp(56px,10vw,104px)] leading-[0.8]">Your profile</h1>
      <p className="mt-3 text-[15px] text-dust">
        This is what people see when they tap your name on the leaderboard.
        {profile ? (
          <>
            {' '}
            <Link href={profileHref(profile.handle)} className="font-semibold text-paper underline underline-offset-4 hover:text-crank">
              View your page
            </Link>
            .
          </>
        ) : null}
      </p>
      <ProfileForm
        userId={user.id}
        initial={{
          handle: profile?.handle ?? '',
          // An email-derived default name isn't prefilled: they pick what people see.
          displayName: profile && profile.name === profile.displayName ? profile.displayName : '',
          bio: profile?.bio ?? '',
          avatarUrl: profile?.avatarUrl ?? null,
        }}
      />
    </div>
  );
}
