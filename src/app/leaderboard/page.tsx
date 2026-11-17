import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';
import { TrackList } from '@/components/TrackList';
import { getCatalog, type Catalog } from '@/lib/catalog';
import { getDiggers, getPlayStats, type Digger, type PlayStats } from '@/lib/leaderboard';
import { fountain, longDate, plural } from '@/lib/shows';
import { profileHref } from '@/lib/profiles';

export const metadata: Metadata = { title: 'Leaderboard' };

const BOARDS = [
  { key: 'songs', label: 'Songs' },
  { key: 'crankers', label: 'Crankers' },
  { key: 'bands', label: 'Bands' },
  { key: 'shows', label: 'Shows' },
  { key: 'diggers', label: 'Diggers' },
] as const;
type Board = (typeof BOARDS)[number]['key'];

const LIMIT = 50;

type Props = { searchParams: Promise<{ board?: string | string[] }> };

/** Who's on top: most-played songs, bands and tapes, and the listeners filling in the archive. */
export default async function LeaderboardPage({ searchParams }: Props) {
  const raw = (await searchParams).board;
  const wanted = Array.isArray(raw) ? raw[0] : raw;
  const board: Board = BOARDS.find((b) => b.key === wanted)?.key ?? 'songs';

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-paper pb-3">
        <h1 className="poster text-[clamp(56px,10vw,128px)] leading-[0.8]">Leaderboard</h1>
        <nav aria-label="Leaderboards" className="flex flex-wrap gap-1 text-[13px] font-semibold">
          {BOARDS.map((b) => (
            <Link
              key={b.key}
              href={b.key === 'songs' ? '/leaderboard' : `/leaderboard?board=${b.key}`}
              aria-current={b.key === board ? 'page' : undefined}
              className={clsx(
                'border px-3 py-1.5',
                b.key === board ? 'border-paper bg-paper text-ink' : 'border-rule text-dust hover:text-paper',
              )}
            >
              {b.label}
            </Link>
          ))}
        </nav>
      </header>
      {board === 'diggers' ? <Diggers /> : <PlayBoard board={board} />}
    </div>
  );
}

function Blurb({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-[60ch] text-[15px] text-dust">{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-[15px] text-dust">{children}</p>;
}

/** One ranked row: big rank number, the thing, and its score on the right. */
function RankRow({
  rank,
  href,
  swatch,
  title,
  sub,
  score,
  unit,
}: {
  rank: number;
  href?: string;
  swatch?: number;
  title: string;
  sub: React.ReactNode;
  score: number;
  unit: [string, string];
}) {
  const body = (
    <>
      <span className={clsx('poster text-center text-[30px] leading-none tnum', rank <= 3 ? 'text-crank' : 'text-dust')}>{rank}</span>
      <span className="flex min-w-0 items-center gap-3">
        {swatch !== undefined ? (
          <span className="h-9 w-9 shrink-0" style={{ backgroundImage: fountain(swatch) }} aria-hidden="true" />
        ) : null}
        <span className="min-w-0">
          <span className="poster block truncate text-[24px] leading-none group-hover:text-crank sm:text-[28px]">{title}</span>
          <span className="mt-1 block truncate text-[13px] text-dust tnum">{sub}</span>
        </span>
      </span>
      <span className="pr-3 text-right">
        <span className="poster block text-[28px] leading-none tnum">{score.toLocaleString('en-US')}</span>
        <span className="block text-[12px] text-dust">{score === 1 ? unit[0] : unit[1]}</span>
      </span>
    </>
  );
  const cls = 'group grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3 outline-offset-[-2px]';
  return (
    <li className="border-b border-rule">
      {href ? (
        <Link href={href} className={clsx(cls, 'hover:bg-tape')}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

/** Plays per catalog track, counted on this site only (see getPlayStats). */
function playsByTrack(catalog: Catalog, stats: PlayStats) {
  // Some files were imported more than once; credit each audio file's plays to one copy only.
  const plays = new Map<string, number>();
  const seen = new Set<string>();
  for (const t of catalog.tracks) {
    const n = stats.byUrl.get(t.url);
    if (!n || seen.has(t.url)) continue;
    seen.add(t.url);
    plays.set(t.id, n);
  }
  return plays;
}

async function PlayBoard({ board }: { board: Exclude<Board, 'diggers'> }) {
  let stats: PlayStats;
  try {
    stats = await getPlayStats();
  } catch (err) {
    console.error('[leaderboard] plays', err);
    return <Empty>Plays couldn’t load right now. Try again in a minute.</Empty>;
  }
  const catalog = await getCatalog();
  const plays = playsByTrack(catalog, stats);
  if (board === 'crankers') return <Crankers stats={stats} />;
  if (board === 'bands') return <Bands catalog={catalog} plays={plays} />;
  if (board === 'shows') return <Shows catalog={catalog} plays={plays} />;
  return <Songs catalog={catalog} plays={plays} total={stats.total} />;
}

function Songs({ catalog, plays, total }: { catalog: Catalog; plays: Map<string, number>; total: number }) {
  // TrackList shows `streams`; hand it this site's play count instead of the old counter.
  const tracks = catalog.tracks
    .filter((t) => plays.has(t.id))
    .map((t) => ({ ...t, streams: plays.get(t.id)! }))
    .sort((a, b) => b.streams - a.streams)
    .slice(0, LIMIT);
  return (
    <>
      <Blurb>
        The most-played cuts on GoGo Garden: {plural(total, 'play')} so far. A play counts after 30 seconds.
      </Blurb>
      {tracks.length ? (
        <TrackList tracks={tracks} variant="ranked" source="Leaderboard" />
      ) : (
        <Empty>Nothing’s been played yet. Hit play on something and it lands here.</Empty>
      )}
    </>
  );
}

function Crankers({ stats }: { stats: PlayStats }) {
  const listeners = stats.listeners.slice(0, LIMIT);
  return (
    <>
      <Blurb>
        Who’s cranking the most. Signed-in listeners ranked by plays.
        {stats.anon ? ` (${plural(stats.anon, 'play')} from people not logged in aren’t on the board.)` : ''}
      </Blurb>
      {listeners.length ? (
        <ol className="grid border-t border-rule xl:grid-cols-2 xl:gap-x-10">
          {listeners.map((l, i) => (
            <RankRow
              key={l.userId}
              rank={i + 1}
              href={l.handle ? profileHref(l.handle) : undefined}
              title={l.name}
              sub={[l.handle ? `@${l.handle}` : null, plural(l.songs, 'song'), l.topBand ? `mostly ${l.topBand}` : null, `last ${longDate(l.lastPlayed.slice(0, 10))}`]
                .filter(Boolean)
                .join(' · ')}
              score={l.plays}
              unit={['play', 'plays']}
            />
          ))}
        </ol>
      ) : (
        <Empty>Nobody’s cranking yet. Log in and play something.</Empty>
      )}
    </>
  );
}

function Bands({ catalog, plays }: { catalog: Catalog; plays: Map<string, number> }) {
  const byBand = new Map<string, number>();
  for (const t of catalog.tracks) {
    const n = plays.get(t.id);
    if (n) byBand.set(t.bandId, (byBand.get(t.bandId) ?? 0) + n);
  }
  const bands = catalog.bands
    .filter((b) => byBand.has(b.id))
    .sort((a, b) => byBand.get(b.id)! - byBand.get(a.id)! || b.trackCount - a.trackCount)
    .slice(0, LIMIT);
  return (
    <>
      <Blurb>Bands ranked by plays across every tape they have up.</Blurb>
      {bands.length ? (
        <ol className="grid border-t border-rule xl:grid-cols-2 xl:gap-x-10">
          {bands.map((b, i) => (
            <RankRow
              key={b.id}
              rank={i + 1}
              href={`/bands/${encodeURIComponent(b.id)}`}
              swatch={b.palette}
              title={b.name}
              sub={`${plural(b.showCount, 'tape')}, ${plural(b.trackCount, 'track')}`}
              score={byBand.get(b.id)!}
              unit={['play', 'plays']}
            />
          ))}
        </ol>
      ) : (
        <Empty>No band has a play yet.</Empty>
      )}
    </>
  );
}

function Shows({ catalog, plays }: { catalog: Catalog; plays: Map<string, number> }) {
  const byShow = new Map<string, number>();
  for (const t of catalog.tracks) {
    const n = plays.get(t.id);
    if (n) byShow.set(t.showHref, (byShow.get(t.showHref) ?? 0) + n);
  }
  const shows = catalog.shows
    .filter((s) => byShow.has(s.href))
    .sort((a, b) => byShow.get(b.href)! - byShow.get(a.href)!)
    .slice(0, LIMIT);
  return (
    <>
      <Blurb>The tapes getting run the most, live PAs and studio joints alike.</Blurb>
      {shows.length ? (
        <ol className="grid border-t border-rule xl:grid-cols-2 xl:gap-x-10">
          {shows.map((s, i) => (
            <RankRow
              key={s.key}
              rank={i + 1}
              href={s.href}
              swatch={s.palette}
              title={s.bandName}
              sub={[longDate(s.date) ?? s.year, s.kind === 'live' ? s.venue : s.title].filter(Boolean).join(' · ') || s.album}
              score={byShow.get(s.href)!}
              unit={['play', 'plays']}
            />
          ))}
        </ol>
      ) : (
        <Empty>No tape has a play yet.</Empty>
      )}
    </>
  );
}

function diggerLine(d: Digger) {
  return [
    d.named ? plural(d.named, 'song') + ' named' : null,
    d.tapes ? `${plural(d.tapes, 'tape')} up (${plural(d.tracks, 'track')})` : null,
    d.bandEdits ? plural(d.bandEdits, 'band fact') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

async function Diggers() {
  let diggers: Digger[] = [];
  let failed = false;
  try {
    diggers = (await getDiggers()).slice(0, LIMIT);
  } catch (err) {
    console.error('[leaderboard] diggers', err);
    failed = true;
  }
  return (
    <>
      <Blurb>
        The listeners filling in the archive. One point per song named, track uploaded, or band fact added.{' '}
        <Link href="/name-these" className="font-semibold text-paper underline underline-offset-4 hover:text-leaf-light">
          Get on the board
        </Link>
        .
      </Blurb>
      {failed ? (
        <Empty>The diggers board couldn’t load right now. Try again in a minute.</Empty>
      ) : diggers.length ? (
        <ol className="grid border-t border-rule xl:grid-cols-2 xl:gap-x-10">
          {diggers.map((d, i) => (
            <RankRow
              key={d.userId}
              rank={i + 1}
              href={d.handle ? profileHref(d.handle) : undefined}
              title={d.name}
              sub={[d.handle ? `@${d.handle}` : null, diggerLine(d)].filter(Boolean).join(' · ')}
              score={d.points}
              unit={['point', 'points']}
            />
          ))}
        </ol>
      ) : (
        <Empty>Nobody’s on the board yet. Name a song or upload a tape to be first.</Empty>
      )}
    </>
  );
}
