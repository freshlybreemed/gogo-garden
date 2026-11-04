/**
 * Go-go "albums" are mostly live PA tapes named like
 * `12-15-07 @ Largo High School` or `NIB:10-2-09 @ Le Pearl "Disc 2"`.
 * This turns those strings into show info (date + venue) and provides the
 * display helpers shared by server and client components.
 */

export type ShowInfo = {
  /** `live` = PA tape from a show; `tape` = studio CD, mixtape, compilation. */
  kind: 'live' | 'tape';
  /** `YYYY-MM-DD`, `YYYY-MM` (day unknown) or `YYYY`; sortable as a string. */
  date: string | null;
  venue: string | null;
  /** Display title for tapes (and undated shows without a venue). */
  title: string;
  note: string | null;
  disc: number | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function fullYear(y: string) {
  const n = Number(y);
  if (y.length === 4) return n;
  return n <= 30 ? 2000 + n : 1900 + n;
}

const pad = (n: number) => String(n).padStart(2, '0');

function tidy(s: string) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–:,@()]+|[\s\-–:,@(]+$/g, '')
    .trim();
}

/** "lapearl" -> "Lapearl"; leaves mixed-case strings alone. */
function capitalizeIfLower(s: string) {
  if (s !== s.toLowerCase()) return s;
  return s.replace(/(^|\s)([a-z])/g, (_m, sp: string, c: string) => sp + c.toUpperCase());
}

/** Short all-caps tokens (NIB, TCB, BYB) and known band names are band tags. */
function isBandTag(s: string, aliases: Set<string>) {
  const t = s.replace(/[()]/g, '').trim();
  if (!t) return true;
  if (aliases.has(normalizeName(t))) return true;
  return /^[A-Z0-9&.]{2,5}$/.test(t);
}

function isValidDate(y: number, m: number, d: number) {
  return m >= 1 && m <= 12 && d >= 0 && d <= 31 && y >= 1970 && y <= 2035;
}

export function parseAlbum(
  raw: string,
  opts: { date?: string | null; venue?: string | null; aliases?: Set<string> } = {},
): ShowInfo {
  const aliases = opts.aliases ?? new Set<string>();
  let s = raw.replace(/\s+/g, ' ').trim();

  if (!s || /^<?unknown>?$/i.test(s) || /^no album$/i.test(s) || /^unknown album\b/i.test(s)) {
    return { kind: 'tape', date: null, venue: null, title: 'Loose tracks', note: null, disc: null };
  }
  if (/^https?:\/\//i.test(s)) {
    return { kind: 'tape', date: null, venue: null, title: 'Loose tracks', note: null, disc: null };
  }

  let disc: number | null = null;
  s = s.replace(/\(?\b(?:disc|disk)\s*(\d+)\)?/i, (_m, n: string) => {
    disc = Number(n);
    return ' ';
  });
  s = s.replace(/\bdiscs?\s+[IVX]+\s+and\s+[IVX]+\b/i, ' ').trim() || s;

  // Dates: 12-15-07, 1/22/10, 02-22-2006, 20060113, 2-2009
  let date: string | null = null;
  let before = s;
  let after = '';
  let wrapped = false;

  const mdy = s.match(/(\(?)\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b(\)?)/);
  const ymd = !mdy ? s.match(/\b((?:19|20)\d{2})(\d{2})(\d{2})\b/) : null;
  const my = !mdy && !ymd ? s.match(/\b(\d{1,2})-((?:19|20)\d{2})\b/) : null;

  if (mdy && mdy.index !== undefined) {
    const [whole, open, m, d, y, close] = mdy;
    const year = fullYear(y);
    const month = Number(m);
    const day = Number(d);
    if (isValidDate(year, month, day)) {
      date = day === 0 ? `${year}-${pad(month)}` : `${year}-${pad(month)}-${pad(day)}`;
      wrapped = Boolean(open && close);
      before = s.slice(0, mdy.index);
      after = s.slice(mdy.index + whole.length);
    }
  } else if (ymd && ymd.index !== undefined) {
    const [whole, y, m, d] = ymd;
    if (isValidDate(Number(y), Number(m), Number(d))) {
      date = `${y}-${m}-${d}`;
      before = s.slice(0, ymd.index);
      after = s.slice(ymd.index + whole.length);
    }
  } else if (my && my.index !== undefined) {
    const [whole, m, y] = my;
    if (isValidDate(Number(y), Number(m), 1)) {
      date = `${y}-${pad(Number(m))}`;
      before = s.slice(0, my.index);
      after = s.slice(my.index + whole.length);
    }
  }

  if (opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date)) date = opts.date;

  // Quoted subtitles and *notes*, "ft." guests and parentheticals become the note.
  const notes: string[] = [];
  const pullNotes = (text: string) =>
    text
      .replace(/"([^"]+)"|\*([^*]+)\*/g, (_m, a?: string, b?: string) => {
        notes.push((a ?? b ?? '').trim());
        return ' ';
      })
      .replace(/\(([^)]*)\)/g, (_m, inner: string) => {
        if (!isBandTag(inner, aliases)) notes.push(inner.trim());
        return ' ';
      })
      .replace(/\s+(?:with|ft\.?|feat\.?)\s+(.+)$/i, (_m, guest: string) => {
        notes.push(`ft. ${guest.trim()}`);
        return ' ';
      });

  // A date in parentheses after a name is a release date: "Guilty By Association(5-10-09)".
  if (date && wrapped && tidy(before)) {
    const title = tidy(pullNotes(before));
    return { kind: 'tape', date, venue: null, title, note: notes.join(', ') || null, disc };
  }

  const atIn = (text: string) => text.match(/(?:^|\s|\b)(?:@|at\s)\s*(.*)$/i);

  if (date) {
    let venue: string | null = null;
    const afterClean = tidy(pullNotes(after.replace(/^\s*(?:live\s*)?(?:@|at\s)/i, ' ')));
    const beforeAt = atIn(before);
    if (beforeAt) {
      // "Live @ Club G 5-1-09"
      venue = tidy(pullNotes(beforeAt[1]));
    } else if (afterClean) {
      venue = afterClean;
    } else {
      const prefix = tidy(pullNotes(before.replace(/:\s*$/, '')));
      const words = prefix.replace(/\blive\b/i, '').trim();
      if (words && !isBandTag(words, aliases)) venue = words;
    }
    venue = venue ? capitalizeIfLower(venue.replace(/^live\s+/i, '')) || null : null;
    if (opts.venue) venue = opts.venue;
    return {
      kind: 'live',
      date,
      venue,
      title: venue ?? 'Unknown venue',
      note: notes.filter(Boolean).join(', ') || null,
      disc,
    };
  }

  // Undated but clearly a show: "Live @ greenbelt marriot", "x @ le pearl ft doo dirty"
  const at = atIn(s);
  if (at && at[1].trim()) {
    const venue = opts.venue ?? capitalizeIfLower(tidy(pullNotes(at[1])));
    return {
      kind: 'live',
      date: null,
      venue: venue || null,
      title: venue || 'Unknown venue',
      note: notes.filter(Boolean).join(', ') || null,
      disc,
    };
  }

  // Studio CDs, mixtapes, compilations. Drop a leading "Band:" tag.
  let title = s.replace(/^([^:]{1,24}):\s*/, (m, tag: string) => (isBandTag(tag, aliases) ? '' : m));
  title = capitalizeIfLower(tidy(title.replace(/"/g, '')) || tidy(s));
  const year = title.match(/\b((?:19|20)\d{2})\b/);
  return {
    kind: 'tape',
    date: year ? year[1] : null,
    venue: opts.venue ?? null,
    title,
    note: null,
    disc,
  };
}

/** `2007-12-15` -> `12-15-07`, the way the tapes write it. */
export function shortDate(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split('-');
  if (d) return `${Number(m)}-${Number(d)}-${y.slice(2)}`;
  if (m) return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`;
  return y;
}

/** `2007-12-15` -> `Sat, Dec 15 2007`. */
export function longDate(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  if (d) {
    const dow = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return `${dow}, ${MONTHS[m - 1]} ${d} ${y}`;
  }
  if (m) return `${MONTHS[m - 1]} ${y}`;
  return String(y);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Small stable hash so near-identical album names get distinct slugs. */
export function shortHash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 5);
}

/** "Track 7", "07", "" -> the part number; real titles -> null. */
export function genericTrackNumber(title: string): number | null {
  const t = title.trim();
  if (!t) return 0;
  const m = t.match(/^(?:track|trk|part|pt\.?)?\s*#?\s*0*(\d{1,3})$/i);
  return m ? Number(m[1]) : null;
}

export function formatDuration(secs: number) {
  if (!Number.isFinite(secs) || secs <= 0) return '–';
  const s = Math.round(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = `${s % 60}`.padStart(2, '0');
  return h ? `${h}:${`${m}`.padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export function formatRunTime(secs: number) {
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}

/**
 * Split-fountain palettes after Globe Poster's go-go show cards. Each band gets
 * one, deterministically, so its poster card, J-card spine and player chip match.
 */
export const POSTER_PALETTES: ReadonlyArray<readonly [string, string, string]> = [
  ['#FFE600', '#FF8A00', '#FF2E88'],
  ['#9DFF3A', '#FFF04D', '#FFB000'],
  ['#2FD6FF', '#B66BFF', '#FF4FD8'],
  ['#FFC21A', '#FF6A1A', '#FF2B2B'],
  ['#FF5FA2', '#FF9E4F', '#FFE94D'],
  ['#C6FF00', '#3BFFB0', '#00D5FF'],
];

export function paletteFor(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % POSTER_PALETTES.length;
}

export function fountain(palette: number, angle = 180) {
  const [a, b, c] = POSTER_PALETTES[palette % POSTER_PALETTES.length];
  return `linear-gradient(${angle}deg, ${a} 0%, ${b} 55%, ${c} 100%)`;
}

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export function yearSpan(first: string | null, last: string | null) {
  if (!first || !last) return null;
  const a = first.slice(0, 4);
  const b = last.slice(0, 4);
  return a === b ? a : `${a}–${b}`;
}

/** How a track is named outside its own show: "Part 7" plus the show. */
export function trackTitle(t: { title: string; part: number | null }) {
  if (t.part === null) return t.title;
  return t.part > 0 ? `Part ${t.part}` : 'Untitled';
}

export const venueHref = (slug: string) => `/venues/${encodeURIComponent(slug)}`;

/** "Open", "Closed", "Demolished"... normalized for the status stamp. */
export function venueStatus(status: string | null): { label: string; open: boolean } | null {
  if (!status) return null;
  const s = status.trim();
  const open = /^(open|active|operating|still open)/i.test(s);
  return { label: s.charAt(0).toUpperCase() + s.slice(1), open };
}

export function place(city: string | null, state: string | null) {
  return [city, state].filter(Boolean).join(', ') || null;
}
