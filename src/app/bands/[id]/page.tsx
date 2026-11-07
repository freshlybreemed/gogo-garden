import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BandArt } from '@/components/art/BandArt';
import { BandAbout } from '@/components/band/BandAbout';
import { SectionHead, ShowCard, ShowRows } from '@/components/cards';
import { PlayButton } from '@/components/PlayButton';
import { TrackList } from '@/components/TrackList';
import { getCatalog, popularForBand } from '@/lib/catalog';
import { fountain, plural, yearSpan } from '@/lib/shows';
import type { ShowModel } from '@/lib/types';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const band = (await getCatalog()).bandById.get(decodeURIComponent(id));
  return { title: band?.name ?? 'Band not found' };
}

function byYear(shows: ShowModel[]) {
  const groups: { year: string; shows: ShowModel[] }[] = [];
  for (const s of shows) {
    const year = s.date?.slice(0, 4) ?? 'Date unknown';
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.shows.push(s);
    else groups.push({ year, shows: [s] });
  }
  return groups;
}

export default async function BandPage({ params }: Params) {
  const { id } = await params;
  const catalog = await getCatalog();
  const band = catalog.bandById.get(decodeURIComponent(id));
  if (!band) notFound();

  const shows = catalog.showsByBand.get(band.id) ?? [];
  const live = shows.filter((s) => s.kind === 'live');
  const tapes = shows.filter((s) => s.kind === 'tape');
  const popular = popularForBand(catalog, band.id, 10);
  const years = yearSpan(band.firstDate, band.lastDate);
  const source = `${band.name}, popular`;

  return (
    <div>
      {/* Poster header: band stock across the top, photo copied onto it. */}
      <header className="relative text-ink" style={{ backgroundImage: fountain(band.palette, 160) }}>
        <div className="flex flex-col gap-5 px-4 pt-5 pb-6 sm:flex-row sm:items-end sm:gap-8 md:px-8 md:pt-10 md:pb-8">
          <BandArt
            name={band.name}
            image={band.image}
            palette={band.palette}
            priority
            className="w-40 shrink-0 border-[3px] border-ink sm:w-52 lg:w-64"
          />
          <div className="min-w-0">
            <h1 className="poster text-[clamp(56px,10vw,148px)] leading-[0.8] break-words">{band.name}</h1>
            {band.fullName ? (
              <p className="mt-2 font-display text-[22px] font-extrabold uppercase sm:text-[28px]">{band.fullName}</p>
            ) : null}
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t-[3px] border-ink pt-2.5 font-display text-[20px] font-extrabold uppercase sm:text-[24px]">
              <div className="flex gap-1.5">
                <dt className="sr-only">Shows</dt>
                <dd className="tnum">{plural(live.length, 'show')}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="sr-only">Tracks</dt>
                <dd className="tnum">{plural(band.trackCount, 'track')}</dd>
              </div>
              {years ? (
                <div className="flex gap-1.5">
                  <dt className="sr-only">Years</dt>
                  <dd className="tnum">{years}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8">
        <div className="flex items-center gap-4 py-6">
          <PlayButton tracks={popular} source={source} />
          <p className="text-[13px] text-dust">Plays the {popular.length} most-played tracks.</p>
        </div>

        {popular.length ? (
          <section aria-labelledby="popular">
            <SectionHead id="popular" title="Popular" />
            <TrackList tracks={popular} variant="mixed" source={source} />
          </section>
        ) : null}

        <BandAbout band={band} />

        {live.length ? (
          <section aria-labelledby="shows" className="mt-12">
            <SectionHead id="shows" title="Shows, newest first" />
            {byYear(live).map((group) => (
              <div key={group.year} className="mt-6 grid gap-4 first:mt-0 lg:grid-cols-[6rem_minmax(0,1fr)]">
                <h3 className="poster text-[40px] leading-none text-dust lg:sticky lg:top-4 lg:self-start lg:pt-2">{group.year}</h3>
                <ShowRows shows={group.shows} />
              </div>
            ))}
          </section>
        ) : null}

        {tapes.length ? (
          <section aria-labelledby="tapes" className="mt-12">
            <SectionHead id="tapes" title="Studio and mixtapes" />
            <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              {tapes.map((show) => (
                <li key={show.key}>
                  <ShowCard show={show} hideBand />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!shows.length ? (
          <p className="py-10 text-[15px] text-dust">No tapes from {band.name} yet. Check back after the next import.</p>
        ) : null}
      </div>
    </div>
  );
}
