import { cookies } from 'next/headers';
import App from '@/components/App';
import { AppDataProvider } from '@/components/AppData';
import { AUTH_COOKIE } from '@/lib/helpers';
import { getArtists, getSongs } from '@/lib/queries';
import type { ArtistModel, TrackModel } from '@/lib/types';

// Stream counts change constantly and login state comes from a cookie.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const loggedIn = Boolean((await cookies()).get(AUTH_COOKIE)?.value);

  let artists: ArtistModel[] = [];
  let tracks: TrackModel[] = [];
  let loadError: string | undefined;
  try {
    [artists, tracks] = await Promise.all([getArtists(), getSongs()]);
  } catch (err) {
    console.error(err);
    loadError = err instanceof Error ? err.message : String(err);
  }

  return (
    <AppDataProvider
      artists={artists}
      tracks={tracks}
      initialLoggedIn={loggedIn}
      loadError={loadError}
    >
      <App />
    </AppDataProvider>
  );
}
