import type { Metadata } from 'next';
import Link from 'next/link';
import { SectionHead } from '@/components/cards';
import { getCatalog, untitledShows } from '@/lib/catalog';
import { fountain, plural, shortDate } from '@/lib/shows';

export const metadata: Metadata = {
  title: 'Help name these',
  description: 'PA tapes full of untitled cuts. Know the songs? Name them.',
};

export default async function NameThesePage() {
  const catalog = await getCatalog();
  const shows = untitledShows(catalog);
  const total = shows.reduce((n, s) => n + s.untitled, 0);

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <section className="px-5 py-6 text-ink sm:px-8" style={{ backgroundImage: fountain(2) }}>
        <p className="font-display text-[18px] font-extrabold uppercase">You were there</p>
        <h1 className="poster mt-1 text-[clamp(52px,10vw,124px)] leading-[0.84]">Help name these.</h1>
        <p className="mt-4 max-w-[46ch] border-t-[3px] border-ink pt-3 font-display text-[20px] leading-[1.1] font-extrabold uppercase sm:text-[24px]">
          {plural(total, 'untitled cut')} across {plural(shows.length, 'tape')}. Know the song? Tap the pencil next to “Part 3” and name it.
        </p>
      </section>

      <section aria-labelledby="most" className="mt-10">
        <SectionHead id="most" title="Most untitled" />
        <ol className="divide-y divide-rule border-y border-rule">
          {shows.map(({ show, untitled, total: n }, i) => (
            <li key={show.key}>
              <Link href={show.href} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 hover:bg-tape">
                <span className="text-center text-[13px] text-dust tnum">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-paper">
                    {show.bandName} · {[shortDate(show.date), show.venue ?? show.title].filter(Boolean).join(' ')}
                  </span>
                  <span className="mt-1 block h-1.5 max-w-[22rem] overflow-hidden bg-rule" aria-hidden="true">
                    <span className="block h-full bg-leaf" style={{ width: `${Math.round(((n - untitled) / n) * 100)}%` }} />
                  </span>
                </span>
                <span className="pr-2 text-right text-[13px] text-dust tnum">
                  <span className="font-semibold text-leaf-light">{untitled}</span> of {n} untitled
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] text-dust">
          Every name is logged and can be undone, so don’t sweat a wrong guess. Not sure?{' '}
          <Link href="/feedback" className="font-semibold text-paper underline underline-offset-4">
            Tell us what you know
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
