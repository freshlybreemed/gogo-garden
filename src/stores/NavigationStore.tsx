import create from 'zustand';

export type NavbarStore = {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

export const useNavbarStore = create<NavbarStore>((set, get) => ({
  searchOpen: false,
  openSearch() {
    set({
      searchOpen: true,
    });
  },
  closeSearch() {
    set({
      searchOpen: false,
    });
  },
}));
