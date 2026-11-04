import { create } from 'zustand';

export type NavbarStore = {
  searchOpen: boolean;
  searchText: string;
  setSearchText: (input: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
};

export const useNavbarStore = create<NavbarStore>((set) => ({
  searchOpen: false,
  searchText: '',
  setSearchText: (searchText) => set({ searchText }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchText: '', searchOpen: false }),
}));
