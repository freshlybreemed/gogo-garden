import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import clsx from 'clsx';
import { Photo } from '@/components/art/Photo';
import { SectionHead } from '@/components/cards';
import { Markdown } from '@/components/Markdown';
import { PlayButton } from '@/components/PlayButton';
import { TrackList } from '@/components/TrackList';
import { getCatalog } from '@/lib/catalog';
import {
  fountain,
  longDate,
  normalizeName,
  place,
  plural,
  shortDate,
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

const OPEN_NIGHTS = 3;

export default async function VenuePage({ params }: Params) {
  const { slug } = await params;
  const catalog = await getCatalog();
  const venue = catalog.venueBySlug.get(decodeURIComponent(slug));
  if (!venue) notFound();

  const doc = catalog.venueDocs.get(venue.slug);
  const shows = catalog.showsByVenue.get(venue.slug) ?? [];
  const nights = byNight(shows);
  const status = venueStatus(venue.status);
  const years = venue.yearsActive ?? yearSpan(venue.firstDate, venue.lastDate);
  const where = place(venue.city, venue.state);
  const hero = doc?.photos[0];
  const strip = doc?.photos.slice(hero ? 1 : 0) ?? [];
  const allTracks = shows.flatMap((s) => catalog.tracksByShow.get(s.href) ?? []);

  return (
    <div>
      {/* Hero: the room itself if we have a photo, else the flyer stock. */}
      <header className="relative overflow-hidden border-b-[3px] border-paper">
        {hero ? (
          <Photo
            src={hero.url}
            alt={hero.caption ?? `${venue.name}`}
            priority
            className="absolute inset-0"
            imgClassName="[filter:grayscale(.55)_contrast(1.15)_brightness(.6)]"
          />
        ) : (
          <div className="absolute inset-0 opacity-90" style={{ backgroundImage: fountain(3, 165) }} aria-hidden="true" />
        )}
        <div
          className={clsx(
            'relative px-4 pt-14 pb-6 md:px-8 md:pt-28 md:pb-8',
            hero ? 'bg-gradient-to-t from-tar via-tar/70 to-transparent text-paper' : 'text-ink',
          )}
        >
          <p className="font-display text-[18px] font-extrabold uppercase sm:text-[22px]">
            {where ?? 'Venue'}
            {years ? `, ${years}` : ''}
          </p>
          <h1 className="poster mt-1 text-[clamp(60px,11vw,160px)] leading-[0.8] break-words">{venue.name}</h1>
          {doc?.aka.length ? (
            <p className="mt-2 text-[14px] font-medium opacity-80">Also known as {doc.aka.join(', ')}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t-[3px] border-current pt-3 font-display text-[20px] font-extrabold uppercase sm:text-[24px]">
            <span className="tnum">{plural(venue.showCount, 'night')} on tape</span>
            <span className="tnum">{plural(venue.bandCount, 'band')}</span>
            <span className="tnum">{plural(venue.trackCount, 'track')}</span>
            {status ? (
              <span
                className={clsx(
                  '-rotate-3 border-[3px] px-2 py-0.5 text-[22px] leading-none',
                  status.open ? 'border-current' : 'border-crank text-crank',
                )}
              >
                {status.label}
              </span>
            ) : null}
          </div>
          {hero?.credit ? (
            <p className="mt-3 text-[11.5px] opacity-70">
              Photo: {hero.sourceUrl ? <a href={hero.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{hero.credit}</a> : hero.credit}
            </p>
          ) : null}
        </div>
      </header>

      <div className="px-4 md:px-8">
        <div className="flex flex-wrap items-center gap-4 py-6">
          <PlayButton tracks={allTracks} source={`Live at ${venue.name}`} label="Play every night" />
          <p className="text-[13px] text-dust">{plural(allTracks.length, 'track')}, newest night first.</p>
        </div>

        {doc && (doc.summary || doc.now || doc.address) ? (
          <section aria-label="About" className="grid gap-6 border-t border-rule pt-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            {doc.summary ? <p className="max-w-[62ch] text-[18px] leading-[1.5] text-paper">{doc.summary}</p> : <span />}
            <dl className="space-y-3 text-[14px]">
              {doc.address ? (
                <div>
                  <dt className="text-dust">Address</dt>
                  <dd>{doc.address}</dd>
                </div>
              ) : null}
              {doc.now ? (
                <div>
                  <dt className="text-dust">There now</dt>
                  <dd>{doc.now}</dd>
                </div>
              ) : null}
              {doc.notableBands.length ? (
                <div>
                  <dt className="text-dust">Regulars</dt>
                  <dd>
                    {doc.notableBands.map((name, i) => {
                      const band = catalog.bands.find(
                        (b) => normalizeName(b.name) === normalizeName(name) || normalizeName(b.fullName ?? '') === normalizeName(name),
                      );
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
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {doc?.history || doc?.gogoImpact ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            {doc.history ? (
              <section aria-labelledby="history">
                <SectionHead id="history" title="History" />
                <Markdown source={doc.history} className="max-w-[66ch] text-[16px] leading-[1.65] text-paper/90" />
              </section>
            ) : null}
            {doc.gogoImpact ? (
              <section aria-labelledby="impact" className="lg:pt-0">
                <SectionHead id="impact" title="What it meant to go-go" />
                <div className="paper p-5 text-[17px] leading-[1.55] font-medium">
                  <Markdown source={doc.gogoImpact} />
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {doc?.memories.length ? (
          <section aria-labelledby="memories" className="mt-12">
            <SectionHead id="memories" title="Memories" />
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {doc.memories.map((m, i) => (
                <li
                  key={i}
                  className={clsx('paper relative px-5 pt-6 pb-4', i % 3 === 0 ? '-rotate-1' : i % 3 === 1 ? 'rotate-[0.8deg]' : 'rotate-0')}
                >
                  {/* masking tape */}
                  <span className="absolute -top-2 left-1/2 h-4 w-20 -translate-x-1/2 rotate-2 bg-[#d9cfae]/80" aria-hidden="true" />
                  <blockquote className="font-marker text-[19px] leading-[1.35]">&ldquo;{m.quote}&rdquo;</blockquote>
                  <p className="mt-3 text-[12.5px] font-semibold">
                    {m.author ?? 'Anonymous'}
                    {m.date ? <span className="font-normal">, {m.date}</span> : null}
                    {m.sourceUrl ? (
                      <>
                        {' '}
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-normal underline underline-offset-2">
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
          <section aria-labelledby="photos" className="mt-12">
            <SectionHead id="photos" title="Photos" />
            <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:-mx-8 md:px-8">
              {strip.map((ph) => (
                <li key={ph.url} className="w-[260px] shrink-0 snap-start sm:w-[320px]">
                  <Photo src={ph.url} alt={ph.caption ?? `${venue.name}`} className="relative" imgClassName="aspect-[4/3] h-auto! bg-tape">
                    <figcaption className="mt-2 text-[12.5px] text-dust">
                      {ph.caption ? <span className="block text-paper/85">{ph.caption}</span> : null}
                      {ph.credit ? (
                        <span className="block">
                          {ph.sourceUrl ? (
                            <a href={ph.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-paper">
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

        <section aria-labelledby="nights" className="mt-12">
          <SectionHead id="nights" title="Every night on tape" />
          <ol>
            {nights.map((night, i) => {
              const bands = [...new Set(night.shows.map((s) => s.bandName))];
              const tracks = night.shows.reduce((n, s) => n + s.trackCount, 0);
              return (
                <li key={night.key}>
                  <details open={i < OPEN_NIGHTS} className="group border-b border-rule">
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

        {doc?.sources.length ? (
          <footer className="mt-14 border-t border-rule pt-4">
            <h2 className="text-[13px] font-semibold text-dust">Sources</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12.5px] text-dust marker:tnum">
              {doc.sources.map((src, i) => (
                <li key={i}>
                  {src.url ? (
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="break-words underline underline-offset-2 hover:text-paper">
                      {src.title ?? hostOf(src.url)}
                    </a>
                  ) : (
                    src.title
                  )}
                </li>
              ))}
            </ol>
          </footer>
        ) : null}

        {!doc ? (
          <p className="mt-10 max-w-[60ch] text-[13px] text-dust">
            The history of {venue.name} hasn&rsquo;t been written up yet. Everything above comes from the tapes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
