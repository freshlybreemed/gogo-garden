import type { Metadata } from 'next';
import { BandCard } from '@/components/cards';
import { getCatalog } from '@/lib/catalog';
import { plural } from '@/lib/shows';

export const metadata: Metadata = { title: 'Bands' };

export default async function BandsPage() {
  const catalog = await getCatalog();
  const bands = catalog.bands.filter((b) => b.trackCount > 0);
  const tracks = bands.reduce((n, b) => n + b.trackCount, 0);

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-paper pb-3">
        <h1 className="poster text-[clamp(64px,10vw,128px)] leading-[0.8]">Bands</h1>
        <p className="font-display text-[20px] font-extrabold text-dust uppercase tnum">
          {plural(bands.length, 'band')}, {plural(tracks, 'track')}
        </p>
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
