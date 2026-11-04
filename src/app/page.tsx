import { BandCard, SectionHead, ShowCard } from '@/components/cards';
import { CrateButton } from '@/components/PlayButton';
import { TrackList } from '@/components/TrackList';
import { getCatalog, mostStreamed, recentlyAdded } from '@/lib/catalog';
import { fountain, plural } from '@/lib/shows';

export default async function Home() {
  const catalog = await getCatalog();
  const recent = recentlyAdded(catalog, 10);
  const top = mostStreamed(catalog, 10);
  const bands = [...catalog.bands].filter((b) => b.trackCount > 0).sort((a, b) => b.trackCount - a.trackCount);
  const live = catalog.shows.filter((s) => s.kind === 'live');
  const years = live
    .map((s) => s.date?.slice(0, 4))
    .filter((y): y is string => Boolean(y))
    .sort();
  const span = years.length ? `${years[0]} to ${years[years.length - 1]}` : null;

  return (
    <div className="px-4 pt-4 md:px-8 md:pt-8">
      {/* The poster. Split-fountain stock, wood type, one call to action. */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden px-5 pt-6 pb-6 text-ink sm:px-8 sm:pt-8 md:pb-8"
        style={{ backgroundImage: fountain(0) }}
      >
        <p className="font-display text-[18px] font-extrabold uppercase sm:text-[22px]">Tha Garden presents</p>
        <h1 id="hero-title" className="poster mt-1 text-[clamp(64px,15vw,184px)] leading-[0.84]">
          The PA tapes
        </h1>
        <div className="mt-5 flex flex-col gap-5 border-t-[3px] border-ink pt-4 lg:flex-row lg:items-end lg:justify-between">
          <p className="max-w-[34rem] font-display text-[22px] leading-[1.05] font-extrabold uppercase sm:text-[28px]">
            {plural(live.length, 'live show')} from {plural(bands.length, 'band')}
            {span ? `, ${span}` : ''}. Recorded off the board, straight from the go‑go.
          </p>
          <div className="flex flex-col items-start gap-2">
            <CrateButton />
            <p className="text-[13px] font-medium">Plays 40 random tracks from the whole library.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent" className="mt-12">
        <SectionHead id="recent" title="Just added" href="/bands" linkLabel="Browse bands" />
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {recent.map((show) => (
            <li key={show.key}>
              <ShowCard show={show} />
            </li>
          ))}
        </ul>
      </section>

      {top.length ? (
        <section aria-labelledby="top" className="mt-12">
          <SectionHead id="top" title="Most streamed" />
          <TrackList tracks={top} variant="ranked" source="Most streamed" />
        </section>
      ) : null}

      <section aria-labelledby="bands" className="mt-12">
        <SectionHead id="bands" title="Bands" href="/bands" linkLabel={`All ${bands.length} bands`} />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {bands.slice(0, 12).map((band, i) => (
            <li key={band.id}>
              <BandCard band={band} priority={i < 6} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
