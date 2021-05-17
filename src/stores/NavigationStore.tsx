import create from 'zustand';

export type NavbarStore = {
  searchOpen: boolean;
  searchText: string;
  setSearchText: (input: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
};

export const useNavbarStore = create<NavbarStore>((set, get) => ({
  searchOpen: false,
  searchText: '',
  setSearchText: (searchText:string)=>set({searchText}),
  openSearch() {
    set({
      searchOpen: true,
    });
  },
  closeSearch() {
    set({
      searchText:'',
      searchOpen: false,
    });
  },
}));
