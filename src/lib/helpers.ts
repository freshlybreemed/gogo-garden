import cookie from 'js-cookie';
import type { ArtistModel } from './types';

export const AUTH_COOKIE = 'id_token';

export const setCookie = (key: string, value: string) => {
  cookie.set(key, value, { expires: 1, path: '/' });
};

export const removeCookie = (key: string) => {
  cookie.remove(key, { path: '/' });
};

export const getCookieFromBrowser = (key: string) => cookie.get(key);

export function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

/** Takes seconds (despite the old param name `millis`). */
export function formatTime(secondsIn: number) {
  const timeMillis = secondsIn * 1000;
  const seconds = Math.floor((timeMillis / 1000) % 60);
  const minutes = Math.floor((timeMillis / (1000 * 60)) % 60);
  const hours = Math.floor((timeMillis / (1000 * 60 * 60)) % 24);

  const secsStr = `${seconds}`.padStart(2, '0');
  const minsStr = `${minutes}`.padStart(2, '0');
  const hrsStr = hours !== 0 ? `${hours}:` : '';

  return `${hrsStr}${minsStr}:${secsStr}`;
}

export const getArtistName = (artist: ArtistModel) =>
  artist.useShortName ? artist.shortName : artist.name;

export const KEYS = {
  ESCAPE: 'Escape',
} as const;

export function sample<T>(items: T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}
