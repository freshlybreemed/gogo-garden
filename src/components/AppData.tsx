'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ArtistModel, TrackModel } from '@/lib/types';

type AppData = {
  artists: ArtistModel[];
  tracks: TrackModel[];
  initialLoggedIn: boolean;
  loadError?: string;
  findTrackById: (id: string) => TrackModel | undefined;
};

const AppDataContext = createContext<AppData | null>(null);

/**
 * Library data fetched by the Server Component. Replaces the old
 * TracksStore/ArtistStore fetch-on-mount (zustand still owns UI/player state).
 */
export function AppDataProvider({
  artists,
  tracks,
  initialLoggedIn,
  loadError,
  children,
}: Omit<AppData, 'findTrackById'> & { children: React.ReactNode }) {
  const value = useMemo<AppData>(() => {
    const byId = new Map(tracks.map((t) => [t.id, t]));
    return {
      artists,
      tracks,
      initialLoggedIn,
      loadError,
      findTrackById: (id) => byId.get(id),
    };
  }, [artists, tracks, initialLoggedIn, loadError]);
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>');
  return ctx;
}
