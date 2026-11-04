import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import clsx from 'clsx';
import { Photo } from '@/components/art/Photo';
import { SectionHead } from '@/components/cards';
import { Markdown } from '@/components/Markdown';
import { PlayButton } from '@/components/PlayButton';
import { TrackList } from '@/components/TrackList';
import { getCatalog, type Catalog } from '@/lib/catalog';
import {
  fountain,
  longDate,
  normalizeName,
  place,
  plural,
  shortDate,
  venueHref,
  venueStatus,
  yearSpan,
} from '@/lib/shows';
import type { ShowModel } from '@/lib/types';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const venue = (await getCatalog()).venueBySlug.get(decodeURIComponent(slug));
  return { title: venue?.name ?? 'Venue not found' };
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Shows on the same date are the same night, even across bands and discs. */
function byNight(shows: ShowModel[]) {
  const nights: { key: string; date: string | null; shows: ShowModel[] }[] = [];
  const index = new Map<string, number>();
  for (const s of shows) {
    const key = s.date ?? `undated-${s.album}`;
    const at = index.get(key);
    if (at === undefined) {
      index.set(key, nights.length);
      nights.push({ key, date: s.date, shows: [s] });
    } else nights[at].shows.push(s);
  }
  return nights;
}

function findBand(catalog: Catalog, name: string) {
  const n = normalizeName(name);
  return catalog.bands.find((b) => normalizeName(b.name) === n || normalizeName(b.fullName ?? '') === n);
}

const OPEN_NIGHTS = 3;
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default async function VenuePage({ params }: Params) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const venue = catalog.venueBySlug.get(decodeURIComponent(slug));
  if (!venue) notFound();

  const doc = catalog.venueDocs.get(venue.slug);
  // Low-confidence write-ups only vouch for the name: show the tapes, nothing else.
  const trusted = doc && doc.confidence !== 'low' ? doc : null;
  const shows = catalog.showsByVenue.get(venue.slug) ?? [];
  const nights = byNight(shows);
  const status = venueStatus(venue.status);
  const tapeYears = yearSpan(venue.firstDate, venue.lastDate);
  const where = place(venue.city, venue.state);
  const photos = trusted?.photos ?? [];
  const hero = photos[0];
  const strip = photos.slice(1);
  const allTracks = shows.flatMap((s) => catalog.tracksByShow.get(s.href) ?? []);
  const bandsHere = [...new Map(shows.map((s) => [s.bandId, s])).values()];
  const related = (doc?.related ?? [])
    .map((r) => catalog.venueBySlug.get(r))
    .filter((v): v is NonNullable<typeof v> => Boolean(v) && v!.slug !== venue.slug);
  const hasStory = Boolean(trusted && (trusted.summary || trusted.history || trusted.gogoImpact));

  const facts: { label: string; value: React.ReactNode }[] = [];
  if (trusted?.address) facts.push({ label: 'Address', value: [trusted.address, where].filter(Boolean).join(', ') });
  else if (where) facts.push({ label: 'Where', value: where });
  if (trusted?.yearsActive) facts.push({ label: 'Years', value: trusted.yearsActive });
  if (trusted?.status && !/^unknown$/i.test(trusted.status)) facts.push({ label: 'Status', value: trusted.status });
  if (trusted?.now) facts.push({ label: 'There now', value: trusted.now });
  if (trusted?.notableBands.length) {
    facts.push({
      label: 'Bands that played here',
      value: trusted.notableBands.map((name, i) => {
        const band = findBand(catalog, name);
        return (
          <span key={name}>
            {i ? ', ' : ''}
            {band ? (
              <Link href={`/bands/${encodeURIComponent(band.id)}`} className="underline underline-offset-2 hover:text-crank">
                {name}
              </Link>
            ) : (
              name
            )}
          </span>
        );
      }),
    });
  }

  return (
    <div>
      {/* Hero: the room itself if there's a photo, else flyer stock. */}
      <header className="relative overflow-hidden border-b-[3px] border-paper">
        {hero ? (
          <Photo
            src={hero.url}
            alt={hero.caption ?? venue.name}
            priority
            className="absolute inset-0"
            imgClassName="[filter:grayscale(.55)_contrast(1.15)_brightness(.6)]"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundImage: fountain(3, 165) }} aria-hidden="true" />
        )}
        <div
          className={clsx(
            'relative px-4 pt-14 pb-6 md:px-8 md:pt-24 md:pb-8',
            hero ? 'bg-gradient-to-t from-tar via-tar/70 to-transparent text-paper' : 'text-ink',
          )}
        >
          <p className="font-display text-[18px] font-extrabold uppercase sm:text-[22px]">
            {[where, tapeYears ? `On tape ${tapeYears}` : null].filter(Boolean).join(', ') || 'Venue'}
          </p>
          <h1 className="poster mt-1 text-[clamp(56px,10vw,150px)] leading-[0.82] break-words">{venue.name}</h1>
          {trusted?.aka.length ? (
            <p className="mt-2 text-[14px] font-medium opacity-80">
              Also known as {trusted.aka.filter((a) => a !== venue.name).join(', ')}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t-[3px] border-current pt-3 font-display text-[20px] font-extrabold uppercase sm:text-[24px]">
            <span className="tnum">{plural(venue.showCount, 'night')} on tape</span>
            <span className="tnum">{plural(venue.bandCount, 'band')}</span>
            <span className="tnum">{plural(venue.trackCount, 'track')}</span>
            {status ? (
              <span
                className={clsx(
                  '-rotate-3 border-[3px] px-2 py-0.5 text-[22px] leading-none',
                  status.open ? 'border-current' : hero ? 'border-crank text-crank' : 'border-ink',
                )}
              >
                {status.label}
              </span>
            ) : null}
          </div>
          {hero?.credit ? (
            <p className="mt-3 text-[11.5px] opacity-75">
              Photo:{' '}
              {hero.sourceUrl ? (
                <a href={hero.sourceUrl} {...ext} className="underline underline-offset-2">
                  {hero.credit}
                </a>
              ) : (
                hero.credit
              )}
              {hero.caption ? `. ${hero.caption}` : ''}
            </p>
          ) : null}
        </div>
      </header>

      <div className="px-4 md:px-8">
        <div className="flex flex-wrap items-center gap-4 py-6">
          <PlayButton tracks={allTracks} source={`Live at ${venue.name}`} label="Play every night" />
          <p className="text-[13px] text-dust">{plural(allTracks.length, 'track')}, newest night first.</p>
        </div>

        {hasStory || facts.length ? (
          <div className="grid gap-x-12 gap-y-10 border-t border-rule pt-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              {trusted?.summary ? (
                <p className="max-w-[60ch] font-display text-[22px] leading-[1.1] font-extrabold uppercase sm:text-[30px]">
                  {trusted.summary}
                </p>
              ) : null}
              {trusted?.history ? (
                <section aria-labelledby="history" className="mt-10 first:mt-0">
                  <SectionHead id="history" title="History" />
                  <Markdown source={trusted.history} className="max-w-[66ch] text-[16px] leading-[1.65] text-paper/90" />
                </section>
              ) : null}
            </div>
            <aside className="space-y-8">
              {facts.length ? (
                <dl className="space-y-4 border-l-[3px] border-crank pl-4 text-[14px] leading-[1.5]">
                  {facts.map((f) => (
                    <div key={f.label}>
                      <dt className="font-semibold text-dust">{f.label}</dt>
                      <dd className="mt-0.5 text-paper">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {trusted?.gogoImpact ? (
                <section aria-labelledby="impact">
                  <h2 id="impact" className="poster mb-3 text-[30px]">
                    What it meant to go-go
                  </h2>
                  <div className="paper p-5 text-[16.5px] leading-[1.55] font-medium">
                    <Markdown source={trusted.gogoImpact} />
                  </div>
                </section>
              ) : null}
              {trusted?.confidence === 'medium' ? (
                <p className="text-[12.5px] text-dust">
                  Partly verified. Some details here rest on a single source; see the notes at the bottom.
                </p>
              ) : null}
            </aside>
          </div>
        ) : (
          /* Empty state: the tapes are the only record. Say what we do know. */
          <section aria-label="What we know" className="border-t border-rule pt-8">
            <div className="paper relative max-w-[44rem] px-6 pt-6 pb-5">
              <span className="absolute -top-2 left-8 h-4 w-24 -rotate-2 bg-[#d9cfae]/85" aria-hidden="true" />
              <p className="font-marker text-[22px] leading-[1.3]">
                Only known from the tapes.
              </p>
              <p className="mt-3 text-[15px] leading-[1.6]">
                {plural(venue.showCount, 'night')} recorded here
                {tapeYears ? `, ${tapeYears}` : ''}, by{' '}
                {bandsHere.map((s, i) => (
                  <span key={s.bandId}>
                    {i ? (i === bandsHere.length - 1 ? ' and ' : ', ') : ''}
                    <Link href={`/bands/${encodeURIComponent(s.bandId)}`} className="font-semibold underline underline-offset-2">
                      {s.bandName}
                    </Link>
                  </span>
                ))}
                . Where it stood and what happened to it haven&rsquo;t been confirmed, so this page sticks to the
                recordings.
              </p>
            </div>
          </section>
        )}

        {trusted?.memories.length ? (
          <section aria-labelledby="memories" className="mt-14">
            <SectionHead id="memories" title="Memories" />
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {trusted.memories.map((m, i) => (
                <li
                  key={i}
                  className={clsx('paper relative px-5 pt-6 pb-4', i % 3 === 0 ? '-rotate-1' : i % 3 === 1 ? 'rotate-[0.8deg]' : '')}
                >
                  <span className="absolute -top-2 left-1/2 h-4 w-20 -translate-x-1/2 rotate-2 bg-[#d9cfae]/85" aria-hidden="true" />
                  <blockquote className="font-marker text-[19px] leading-[1.35]">&ldquo;{m.quote}&rdquo;</blockquote>
                  <p className="mt-3 text-[12.5px] font-semibold">
                    {m.author ?? 'Anonymous'}
                    {m.date ? <span className="font-normal">, {m.date}</span> : null}
                    {m.sourceUrl ? (
                      <>
                        {' '}
                        <a href={m.sourceUrl} {...ext} className="font-normal underline underline-offset-2">
                          via {hostOf(m.sourceUrl)}
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {strip.length ? (
          <section aria-labelledby="photos" className="mt-14">
            <SectionHead id="photos" title="Photos" />
            <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8">
              {strip.map((ph) => (
                <li key={ph.url} className="w-[260px] shrink-0 snap-start sm:w-[320px]">
                  <Photo src={ph.url} alt={ph.caption ?? venue.name} className="relative" imgClassName="aspect-[4/3] h-auto! bg-tape">
                    <figcaption className="mt-2 text-[12.5px] text-dust">
                      {ph.caption ? <span className="block text-paper/85">{ph.caption}</span> : null}
                      {ph.credit ? (
                        <span className="block">
                          {ph.sourceUrl ? (
                            <a href={ph.sourceUrl} {...ext} className="underline underline-offset-2 hover:text-paper">
                              {ph.credit}
                            </a>
                          ) : (
                            ph.credit
                          )}
                        </span>
                      ) : null}
                    </figcaption>
                  </Photo>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length ? (
          <section aria-labelledby="related" className="mt-14">
            <SectionHead id="related" title="Same room, other names" />
            <ul className="flex flex-wrap gap-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={venueHref(r.slug)} className="inline-flex h-12 items-center gap-3 border border-rule px-4 hover:border-paper">
                    <span className="poster text-[24px] leading-none">{r.name}</span>
                    <span className="text-[12px] text-dust tnum">
                      {plural(r.showCount, 'night')}
                      {yearSpan(r.firstDate, r.lastDate) ? `, ${yearSpan(r.firstDate, r.lastDate)}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="nights" className="mt-14">
          <SectionHead id="nights" title="Every night on tape" />
          <ol>
            {nights.map((night, i) => {
              const bands = [...new Set(night.shows.map((s) => s.bandName))];
              const tracks = night.shows.reduce((n, s) => n + s.trackCount, 0);
              return (
                <li key={night.key}>
                  <details open={i < OPEN_NIGHTS || nights.length <= 4} className="group border-b border-rule">
                    <summary className="flex cursor-pointer list-none items-baseline gap-4 py-3 outline-offset-[-2px] [&::-webkit-details-marker]:hidden">
                      <span className="poster w-[8.5rem] shrink-0 text-[36px] leading-none whitespace-nowrap tnum sm:w-[11rem] sm:text-[48px]">
                        {shortDate(night.date) ?? 'Undated'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="poster block truncate text-[24px] leading-none">{bands.join(' + ')}</span>
                        <span className="block text-[13px] text-dust tnum">
                          {night.date ? `${longDate(night.date)}, ` : ''}
                          {plural(tracks, 'track')}
                        </span>
                      </span>
                      <span className="text-[13px] font-semibold text-dust group-open:hidden">Show</span>
                      <span className="hidden text-[13px] font-semibold text-dust group-open:inline">Hide</span>
                    </summary>
                    <div className="space-y-6 pb-6">
                      {night.shows.map((show) => {
                        const showTracks = catalog.tracksByShow.get(show.href) ?? [];
                        const source = `${show.bandName} ${shortDate(show.date) ?? ''} ${venue.name}`.trim();
                        return (
                          <div key={show.key}>
                            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                              <span className="h-4 w-4" style={{ backgroundImage: fountain(show.palette) }} aria-hidden="true" />
                              <Link
                                href={`/bands/${encodeURIComponent(show.bandId)}`}
                                className="poster text-[22px] leading-none hover:text-crank"
                              >
                                {show.bandName}
                              </Link>
                              {show.disc ? <span className="text-[13px] text-dust">Disc {show.disc}</span> : null}
                              {show.note ? <span className="text-[13px] text-dust italic">{show.note}</span> : null}
                              <Link href={show.href} className="text-[13px] text-dust underline-offset-4 hover:text-paper hover:underline">
                                Show page
                              </Link>
                              <PlayButton tracks={showTracks} source={source} className="ml-auto h-10!" />
                            </div>
                            <TrackList tracks={showTracks} variant="show" source={source} />
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>

        {trusted && (trusted.sources.length || trusted.notes) ? (
          <footer className="mt-14 border-t border-rule pt-4 text-[12.5px] text-dust">
            {trusted.sources.length ? (
              <>
                <h2 className="font-semibold">Sources</h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {trusted.sources.map((src, i) => (
                    <li key={i}>
                      {src.url ? (
                        <a href={src.url} {...ext} className="break-words underline underline-offset-2 hover:text-paper">
                          {src.title ?? hostOf(src.url)}
                        </a>
                      ) : (
                        src.title
                      )}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
            {trusted.notes ? (
              <p className="mt-4 max-w-[80ch]">
                <span className="font-semibold">Research notes: </span>
                {trusted.notes}
              </p>
            ) : null}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
