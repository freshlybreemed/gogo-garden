/** Same-origin path to go to after auth; never back to the auth pages themselves. */
export function safeNext(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  if (/^\/(login|signup|auth)(\/|\?|$)/.test(next)) return '/';
  return next;
}
