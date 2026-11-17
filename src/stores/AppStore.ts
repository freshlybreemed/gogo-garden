import { create } from 'zustand';

export type AppStore = {
  /** null until the user logs in/out in this tab; fall back to the SSR cookie. */
  loggedIn: boolean | null;
  /** Login state the server rendered the page with (set once by the root layout's player). */
  ssrLoggedIn: boolean;
  setLoggedIn: (bool: boolean) => void;
  setSsrLoggedIn: (bool: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  loggedIn: null,
  ssrLoggedIn: false,
  setLoggedIn: (bool) => set({ loggedIn: bool }),
  setSsrLoggedIn: (bool) => set({ ssrLoggedIn: bool }),
}));

/** Best current guess at whether this tab has a signed-in user. */
export const isLoggedIn = (s: AppStore = useAppStore.getState()) => s.loggedIn ?? s.ssrLoggedIn;
