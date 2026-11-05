/**
 * Free plays for logged-out listeners. Counted in localStorage (so reloads don't reset it); falls back
 * to an in-memory count when storage is blocked. Not a security boundary, just a nudge to sign up.
 */
export const FREE_PLAYS = 3;
const KEY = 'gogogarden:anonPlays:v1';

let memoryCount = 0;

function read(): number {
  try {
    const n = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? Math.max(Math.floor(n), memoryCount) : memoryCount;
  } catch {
    return memoryCount;
  }
}

function write(n: number) {
  memoryCount = n;
  try {
    window.localStorage.setItem(KEY, String(n));
  } catch {
    /* storage blocked: memory count still applies for this tab */
  }
}

/** Plays a logged-out visitor has used. */
export function anonPlaysUsed() {
  return typeof window === 'undefined' ? 0 : read();
}

/** Spend one free play if any are left. Returns false once the limit is reached. */
export function takeFreePlay(): boolean {
  if (typeof window === 'undefined') return true;
  const used = read();
  if (used >= FREE_PLAYS) return false;
  write(used + 1);
  return true;
}
