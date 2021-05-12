import create from 'zustand';
import { getCookieFromBrowser } from '../helpers';

export type AppStore = {
  loggedIn: boolean;
  screen: string;
  setScreen: (mode: string) => void;
  setLoggedIn: (bool: boolean) => void;

}

export const useAppStore = create<AppStore>((set,get) => ({
  screen: 'home',
  loggedIn: getCookieFromBrowser('id_token') ? true : false,
  setScreen: (mode: string) => set({
    screen: mode
  }),
  setLoggedIn: (bool: boolean) => set({
    loggedIn: bool
  }),
}))