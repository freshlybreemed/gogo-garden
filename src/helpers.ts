import format from 'date-fns/format';

export function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

export function formatTime(timeMillis: number) {
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
