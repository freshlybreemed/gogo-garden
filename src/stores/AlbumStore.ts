import { create } from 'zustand';
import type { AlbumModel } from '@/lib/types';

export type { AlbumModel };

type AlbumStore = {
  currentAlbum?: AlbumModel;
  setCurrentAlbum: (album: AlbumModel) => void;
};

export const useAlbumStore = create<AlbumStore>((set) => ({
  setCurrentAlbum: (album) => set({ currentAlbum: album }),
}));
