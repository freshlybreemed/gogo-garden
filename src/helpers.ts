import format from 'date-fns/format';
import cookie from 'js-cookie';

interface Process {
  browser: boolean
}
declare var process: Process

export const setCookie = (key: string, value: string) => {
  if (process.browser) {
    cookie.set(key, value, {
      expires: 1,
      path: '/',
    });
  }
};

export const removeCookie = (key: string) => {
  if (process.browser) {
    cookie.remove(key, {
      expires: 1,
    });
  }
};

export const getCookie = (key: string, req: any) => {
  return process.browser
    ? getCookieFromBrowser(key)
    : getCookieFromServer(key, req);
};

export const getCookieFromBrowser = (key: string) => {
  return cookie.get(key);
};

const getCookieFromServer = (key: string, req: any) => {
  if (!req.headers.cookie) {
    return undefined;
  }
  const rawCookie = req.headers.cookie
    .split(';')
    .find((c: any) => c.trim().startsWith(`${key}=`));
  if (!rawCookie) {
    return undefined;
  }
  return rawCookie.split('=')[1];
};

export function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

export function formatTime(millis: number) {
  const timeMillis = millis * 1000;
  const seconds = Math.floor((timeMillis / 1000) % 60);
  const minutes = Math.floor((timeMillis / (1000 * 60)) % 60);
  const hours = Math.floor((timeMillis / (1000 * 60 * 60)) % 24);

  const secsStr = `${seconds}`.padStart(2, '0');
  const minsStr = `${minutes}`.padStart(2, '0');
  const hrsStr = hours !== 0 ? `${hours}:` : '';

  return `${hrsStr}${minsStr}:${secsStr}`;
}

export function formatTimeSecs(timeSeconds: number) {
  return formatTime(timeSeconds * 1000);
}

export function formatDate(dateString: string) {
  var date = new Date(dateString);
  return format(date, 'MMMM do yyyy');
}
export const isDarwin = /Mac|iPod|iPhone|iPad/.test(
  window.navigator.platform,
);

export const KEYS = {
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
  CTRL_OR_CMD: isDarwin ? 'metaKey' : 'ctrlKey',
  TAB: 'Tab',
  SPACE: ' ',
  QUESTION_MARK: '?',
  F_KEY_CODE: 70,
  ALT_KEY_CODE: 18,
  Z_KEY_CODE: 90,
  G_KEY_CODE: 71,
  M_KEY_CODE: 77,
  ZERO_KEY: '0',
  ONE_KEY: '1',
  TWO_KEY: '2',
  THREE_KEY: '3',
  FOUR_KEY: '4',
  FIVE_KEY: '5',
  SIX_KEY: '6',
  SEVEN_KEY: '7',
  EIGHT_KEY: '8',
  NINE_KEY: '9',
} as const;
