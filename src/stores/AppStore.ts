import { create } from 'zustand';

export type Screen = 'home' | 'album' | 'songs' | 'login' | 'signup';

export type AppStore = {
  /** null until the user logs in/out in this tab; fall back to the SSR cookie. */
  loggedIn: boolean | null;
  screen: Screen;
  setScreen: (mode: Screen) => void;
  setLoggedIn: (bool: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  screen: 'home',
  loggedIn: null,
  setScreen: (mode) => set({ screen: mode }),
  setLoggedIn: (bool) => set({ loggedIn: bool }),
}));
