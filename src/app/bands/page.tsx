import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';
import { BandCard } from '@/components/cards';
import { getCatalog } from '@/lib/catalog';
import { plural } from '@/lib/shows';

export const metadata: Metadata = { title: 'Bands' };

type Props = { searchParams: Promise<{ sort?: string | string[] }> };

export default async function BandsPage({ searchParams }: Props) {
  const raw = (await searchParams).sort;
  const az = (Array.isArray(raw) ? raw[0] : raw) === 'az';
  const catalog = await getCatalog();
  const plays = new Map<string, number>();
  for (const s of catalog.shows) plays.set(s.bandId, (plays.get(s.bandId) ?? 0) + s.streams);
  // Popular: most played, then the biggest catalogs. A-Z keeps the catalog's alphabetical order.
  const bands = catalog.bands
    .filter((b) => b.trackCount > 0)
    .sort(az ? () => 0 : (a, b) => (plays.get(b.id) ?? 0) - (plays.get(a.id) ?? 0) || b.trackCount - a.trackCount);
  const tracks = bands.reduce((n, b) => n + b.trackCount, 0);

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-paper pb-3">
        <h1 className="poster text-[clamp(64px,10vw,128px)] leading-[0.8]">Bands</h1>
        <div className="flex flex-col items-end gap-2">
          <p className="font-display text-[20px] font-extrabold text-dust uppercase tnum">
            {plural(bands.length, 'band')}, {plural(tracks, 'track')}
          </p>
          <nav aria-label="Sort bands" className="flex gap-1 text-[13px] font-semibold">
            {[
              { href: '/bands', label: 'Popular', on: !az },
              { href: '/bands?sort=az', label: 'A–Z', on: az },
            ].map((o) => (
              <Link
                key={o.label}
                href={o.href}
                aria-current={o.on ? 'page' : undefined}
                className={clsx('border px-3 py-1.5', o.on ? 'border-paper bg-paper text-ink' : 'border-rule text-dust hover:text-paper')}
              >
                {o.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {bands.map((band, i) => (
          <li key={band.id}>
            <BandCard band={band} priority={i < 10} />
          </li>
        ))}
      </ul>
    </div>
  );
}
