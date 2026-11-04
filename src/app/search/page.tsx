import type { Metadata } from 'next';
import Link from 'next/link';
import { BandCard, SectionHead, ShowCard } from '@/components/cards';
import { SearchBox } from '@/components/SearchBox';
import { TrackList } from '@/components/TrackList';
import { getCatalog, searchCatalog, type Catalog } from '@/lib/catalog';
import { normalizeName, plural, venueHref } from '@/lib/shows';
import { IconPin } from '@/components/icons';

export const metadata: Metadata = { title: 'Search' };

type Props = { searchParams: Promise<{ q?: string | string[] }> };

/** Venues with the most tapes, for browsing before typing. */
function topVenues(catalog: Catalog, n: number) {
  const counts = new Map<string, { name: string; count: number; slug: string | null }>();
  for (const s of catalog.shows) {
    if (!s.venue) continue;
    const key = s.venueSlug ?? normalizeName(s.venue.replace(/^the\s+/i, ''));
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { name: s.venue.replace(/^the\s+/i, ''), count: 1, slug: s.venueSlug });
  }
  return [...counts.values()].filter((v) => v.count > 1).sort((a, b) => b.count - a.count).slice(0, n);
}

export default async function SearchPage({ searchParams }: Props) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? '').slice(0, 100);
  const catalog = await getCatalog();
  const results = searchCatalog(catalog, q);
  const empty =
    q && !results.bands.length && !results.venues.length && !results.shows.length && !results.tracks.length;

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <h1 className="poster mb-5 text-[clamp(56px,9vw,112px)] leading-[0.8]">Search</h1>
      <SearchBox initial={q} />

      {!q ? (
        <section aria-labelledby="venues" className="mt-10">
          <SectionHead id="venues" title="Venues on tape" />
          <ul className="flex flex-wrap gap-2">
            {topVenues(catalog, 24).map((v) => (
              <li key={v.name}>
                <Link
                  href={v.slug ? venueHref(v.slug) : `/search?q=${encodeURIComponent(v.name)}`}
                  className="inline-flex h-10 items-center gap-2 border border-rule px-3 text-[14px] font-semibold hover:border-paper"
                >
                  {v.name}
                  <span className="text-[12px] font-normal text-dust tnum">{v.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {empty ? (
        <p className="mt-10 max-w-[56ch] text-[16px] text-dust">
          Nothing on tape matches &ldquo;{q}&rdquo;. Try a band&rsquo;s short name (TCB, NIB), a venue, or a date like 12-15-07.
        </p>
      ) : null}

      {results.bands.length ? (
        <section aria-labelledby="r-bands" className="mt-10">
          <SectionHead id="r-bands" title="Bands" />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {results.bands.slice(0, 6).map((b) => (
              <li key={b.id}>
                <BandCard band={b} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results.venues.length ? (
        <section aria-labelledby="r-venues" className="mt-10">
          <SectionHead id="r-venues" title="Venues" />
          <ul className="flex flex-wrap gap-2">
            {results.venues.slice(0, 12).map((v) => (
              <li key={v.slug}>
                <Link
                  href={venueHref(v.slug)}
                  className="inline-flex h-12 items-center gap-2 border border-rule px-3 hover:border-paper"
                >
                  <IconPin className="h-4 w-4 text-dust" />
                  <span className="poster text-[22px] leading-none">{v.name}</span>
                  <span className="text-[12px] text-dust tnum">{plural(v.showCount, 'night')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {results.tracks.length ? (
        <section aria-labelledby="r-tracks" className="mt-10">
          <SectionHead id="r-tracks" title="Tracks" />
          <TrackList tracks={results.tracks} variant="mixed" source={`Search: ${q}`} />
          {results.trackTotal > results.tracks.length ? (
            <p className="mt-3 text-[13px] text-dust">
              Showing the first {results.tracks.length} of {plural(results.trackTotal, 'track')}. Add a word to narrow it down.
            </p>
          ) : null}
        </section>
      ) : null}

      {results.shows.length ? (
        <section aria-labelledby="r-shows" className="mt-10">
          <SectionHead id="r-shows" title="Shows and tapes" />
          <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {results.shows.map((s) => (
              <li key={s.key}>
                <ShowCard show={s} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
