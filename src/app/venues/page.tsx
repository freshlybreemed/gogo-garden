import type { Metadata } from 'next';
import Link from 'next/link';
import clsx from 'clsx';
import { getCatalog } from '@/lib/catalog';
import { place, plural, venueHref, venueStatus, yearSpan } from '@/lib/shows';
import { IconPin } from '@/components/icons';

export const metadata: Metadata = { title: 'Venues' };

export default async function VenuesPage() {
  const catalog = await getCatalog();
  const venues = catalog.venues;

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-paper pb-3">
        <h1 className="poster text-[clamp(64px,10vw,128px)] leading-[0.8]">Venues</h1>
        <p className="font-display text-[20px] font-extrabold text-dust uppercase tnum">
          {plural(venues.length, 'room')} on tape
        </p>
      </header>
      <p className="mb-8 max-w-[60ch] text-[15px] text-dust">
        The clubs, halls and school gyms where the tapes were made, ranked by how many nights were recorded there.
      </p>

      {venues.length ? (
        <ol className="grid border-t border-rule xl:grid-cols-2 xl:gap-x-10">
          {venues.map((v, i) => {
            const status = venueStatus(v.status);
            const years = v.yearsActive ?? yearSpan(v.firstDate, v.lastDate);
            const where = place(v.city, v.state);
            return (
              <li key={v.slug} className="border-b border-rule">
                <Link
                  href={venueHref(v.slug)}
                  className="group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 py-3.5 outline-offset-[-2px] hover:bg-tape"
                >
                  <span className="relative flex h-10 w-9 items-center justify-center text-crank" aria-hidden="true">
                    <IconPin className="h-10 w-10" />
                    <span className="absolute top-[9px] text-[12px] font-extrabold text-ink tnum">{i + 1}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="poster block truncate text-[28px] leading-none group-hover:text-crank sm:text-[32px]">
                      {v.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-dust tnum">
                      {where ? <span className="text-paper/85">{where}</span> : null}
                      {years ? <span>{years}</span> : null}
                      {status ? (
                        <span
                          className={clsx(
                            'border px-1.5 text-[11.5px] leading-[18px] font-bold uppercase',
                            status.open ? 'border-paper/60 text-paper' : 'border-crank text-crank',
                          )}
                        >
                          {status.label}
                        </span>
                      ) : null}
                      <span>{plural(v.bandCount, 'band')}</span>
                    </span>
                  </span>
                  <span className="pr-3 text-right">
                    <span className="poster block text-[34px] leading-none tnum">{v.showCount}</span>
                    <span className="block text-[12px] text-dust">{v.showCount === 1 ? 'night' : 'nights'}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="py-10 text-[15px] text-dust">No venues are tagged yet. Tapes get a venue once the import matches it.</p>
      )}
    </div>
  );
}
