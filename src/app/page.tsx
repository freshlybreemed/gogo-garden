import Image from 'next/image';
import { BandCard, SectionHead, ShowCard } from '@/components/cards';
import { CrateButton } from '@/components/PlayButton';
import { TrackList } from '@/components/TrackList';
import Link from 'next/link';
import { getCatalog, mostStreamed, recentlyAdded, untitledShows } from '@/lib/catalog';
import { fountain, plural } from '@/lib/shows';

/** Homepage banners: one is picked per visit. Each credits the night the photo came from. */
const BANNERS = [
  {
    src: '/images/hero-crank.jpg',
    alt: 'A percussionist laughing mid-song in front of a Maryland flag at Crank Karaoke',
    position: 'object-[50%_35%]',
    kicker: 'Live at Crank Karaoke · 2019',
    title: 'Where the pocket lives.',
    by: { src: '/images/crank-karaoke.png', alt: 'Crank Karaoke', width: 600, height: 415, className: 'h-[56px] w-auto sm:h-[64px]' },
  },
  {
    src: '/images/hero-930.jpg',
    alt: 'A guitarist and dancers mid-song on stage at the 9:30 Club',
    position: 'object-[38%_30%]',
    kicker: 'CCB · 9:30 Club · 2019',
    title: 'Live from the go‑go.',
    by: { src: '/images/chicken-mumbo-sauce.png', alt: 'Chicken & Mumbo Sauce', width: 700, height: 376, className: 'h-[52px] w-auto sm:h-[66px]' },
  },
];

export default async function Home() {
  const catalog = await getCatalog();
  const recent = recentlyAdded(catalog, 10);
  const top = mostStreamed(catalog, 10);
  const needNames = untitledShows(catalog, 4);
  const untitledTotal = untitledShows(catalog).reduce((n, x) => n + x.untitled, 0);
  const bands = [...catalog.bands].filter((b) => b.trackCount > 0).sort((a, b) => b.trackCount - a.trackCount);
  const live = catalog.shows.filter((s) => s.kind === 'live');
  // Every show counts toward the span: exact date if we have it, else the release year.
  const years = catalog.shows
    .map((s) => (s.date ?? s.year)?.slice(0, 4))
    .filter((y): y is string => Boolean(y))
    .sort();
  const banner = BANNERS[Math.floor(Math.random() * BANNERS.length)];
  const span = years.length ? `${years[0]} to today` : null;

  return (
    <div className="px-4 pt-4 md:px-8 md:pt-8">
      {/* The photo first: a live band in the pocket, printed warm like an old flyer. */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate flex min-h-[520px] flex-col justify-end overflow-hidden text-paper sm:min-h-[560px] lg:min-h-[620px]"
      >
        <Image
          src={banner.src}
          alt={banner.alt}
          fill
          priority
          sizes="100vw"
          className={`-z-20 object-cover ${banner.position} [filter:sepia(.3)_contrast(1.12)_saturate(1.15)_brightness(.92)]`}
        />
        <p className="absolute top-4 right-4 flex items-center gap-2.5 text-[11px] font-bold tracking-[.14em] text-paper/85 uppercase sm:top-5 sm:right-6">
          <span className="hidden sm:inline">Brought to you by</span>
          <Image src={banner.by.src} alt={banner.by.alt} width={banner.by.width} height={banner.by.height} className={`${banner.by.className} drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]`} />
        </p>
        {/* Vignette and a dark floor for the type. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,transparent_45%,rgba(0,0,0,.55)),linear-gradient(to_top,rgba(20,15,10,.92),rgba(20,15,10,.35)_45%,transparent_70%)]"
        />
        {/* Film grain. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="px-5 pt-6 pb-6 sm:px-8 md:pb-8">
          <p className="inline-block px-2 py-0.5 font-display text-[16px] font-extrabold uppercase text-ink sm:text-[18px]" style={{ backgroundImage: fountain(0) }}>
            {banner.kicker}
          </p>
          <h1 id="hero-title" className="poster mt-2 text-[clamp(52px,10vw,124px)] leading-[0.86]">
            {banner.title}
          </h1>
          <div className="mt-4 flex flex-col gap-5 border-t-[3px] border-paper/80 pt-4 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-[34rem] font-display text-[20px] leading-[1.05] font-extrabold uppercase sm:text-[26px]">
              {plural(live.length, 'live show')} from {plural(bands.length, 'band')}
              {span ? `, ${span}` : ''}. Recorded off the board.
            </p>
            <div className="flex flex-col items-start gap-2">
              <CrateButton />
              <p className="text-[13px] font-medium text-paper/80">Plays 40 random tracks from the whole library.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent" className="mt-12">
        <SectionHead id="recent" title="New growth" href="/bands" linkLabel="Browse bands" />
        <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {recent.map((show) => (
            <li key={show.key}>
              <ShowCard show={show} />
            </li>
          ))}
        </ul>
      </section>

      {needNames.length ? (
        <section aria-labelledby="name-these" className="mt-12 border-[3px] border-leaf/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="name-these" className="poster text-[34px] sm:text-[40px]">
                Help name these
              </h2>
              <p className="mt-1 max-w-[52ch] text-[14px] text-dust">
                {plural(untitledTotal, 'cut')} on the tapes are still just “Part 3”. You were there. Know the song? Tap the pencil and name it.
              </p>
            </div>
            <Link href="/name-these" className="text-[13px] font-semibold text-paper underline underline-offset-4 hover:text-leaf-light">
              See all
            </Link>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {needNames.map(({ show, untitled }) => (
              <li key={show.key}>
                <Link href={show.href} className="flex items-center justify-between gap-3 border border-rule px-3 py-2.5 hover:border-paper">
                  <span className="min-w-0 truncate text-[14px] font-semibold text-paper">
                    {show.bandName} · {show.album}
                  </span>
                  <span className="shrink-0 text-[12px] text-leaf-light tnum">{untitled} untitled</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      <p className="mt-12 border-t border-rule pt-5 text-[14px] text-dust">
        Ideas, something broken, or know more about a tape?{' '}
        <Link href="/feedback?from=/" className="font-semibold text-paper underline underline-offset-4 hover:text-leaf-light">
          Send feedback
        </Link>
        .
      </p>
    </div>
  );
}
