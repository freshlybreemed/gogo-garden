import { create } from 'zustand';

export type AppStore = {
  /** null until the user logs in/out in this tab; fall back to the SSR cookie. */
  loggedIn: boolean | null;
  setLoggedIn: (bool: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  loggedIn: null,
  setLoggedIn: (bool) => set({ loggedIn: bool }),
}));
