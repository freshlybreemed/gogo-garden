import { create } from 'zustand';
import type { ArtistModel } from '@/lib/types';

export type { ArtistModel };

type ArtistStore = {
  currentArtist?: ArtistModel;
  setCurrentArtist: (artist: ArtistModel) => void;
};

export const useArtistStore = create<ArtistStore>((set) => ({
  setCurrentArtist: (artist) => set({ currentArtist: artist }),
}));
