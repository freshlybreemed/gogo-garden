import Link from 'next/link';
import clsx from 'clsx';
import { BandArt } from './art/BandArt';
import { NowPlayingMark } from './art/NowPlayingMark';
import { formatRunTime, fountain, longDate, plural, shortDate, venueHref, yearSpan } from '@/lib/shows';
import type { BandModel, ShowModel } from '@/lib/types';

/**
 * A show as a cassette J-card: band-colored spine with the band name running
 * up it, newsprint face with the date set big the way the tapes write it.
 */
export function ShowCard({ show, hideBand = false }: { show: ShowModel; hideBand?: boolean }) {
  const dated = show.kind === 'live' && show.date;
  const label = [show.bandName, shortDate(show.date), show.venue ?? show.title].filter(Boolean).join(' ');
  return (
    <div
      className={clsx(
        'group relative flex h-full min-h-[156px] text-ink',
        'transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:-rotate-[0.6deg]',
        'has-[a.card-link:focus-visible]:outline-2 has-[a.card-link:focus-visible]:outline-offset-4 has-[a.card-link:focus-visible]:outline-crank',
      )}
    >
      <span
        className="flex w-9 shrink-0 items-center justify-center overflow-hidden py-2"
        style={{ backgroundImage: fountain(show.palette) }}
        aria-hidden={hideBand ? true : undefined}
      >
        <span className="poster max-h-full truncate text-[17px] [writing-mode:vertical-rl] rotate-180">
          {show.bandName}
        </span>
      </span>
      <span className="paper flex min-w-0 flex-1 flex-col border-l-2 border-dashed border-ink/30 px-3 pt-2.5 pb-2">
        {/* The whole card is this link; the venue link sits above it. */}
        <Link
          href={show.href}
          aria-label={label}
          className="card-link outline-none after:absolute after:inset-0 after:content-['']"
        >
          {dated ? (
            <span className="poster block text-[44px] tracking-tight">{shortDate(show.date)}</span>
          ) : (
            <span className="poster line-clamp-3 block text-[28px] leading-[0.9]">{show.title}</span>
          )}
        </Link>
        {show.kind === 'live' ? (
          show.venueSlug ? (
            <Link
              href={venueHref(show.venueSlug)}
              className="relative z-10 mt-1 line-clamp-2 self-start font-display text-[18px] leading-[1.05] font-extrabold uppercase decoration-2 underline-offset-2 hover:underline"
            >
              {show.venue ?? 'Venue unknown'}
            </Link>
          ) : (
            <span className="mt-1 line-clamp-2 font-display text-[18px] leading-[1.05] font-extrabold uppercase">
              {show.venue ?? 'Venue unknown'}
            </span>
          )
        ) : show.date ? (
          <span className="mt-1 text-[13px] font-semibold">{longDate(show.date)}</span>
        ) : null}
        {show.note ? <span className="mt-1 line-clamp-1 text-[12.5px] italic">{show.note}</span> : null}
        <span className="mt-auto flex items-end justify-between gap-2 border-t border-ink/25 pt-1.5 text-[12px] font-medium">
          <span className="tnum truncate">
            {dated ? longDate(show.date) : show.kind === 'tape' ? 'Studio / mixtape' : 'Date unknown'}
          </span>
          <span className="tnum shrink-0">{plural(show.trackCount, 'track')}</span>
        </span>
      </span>
      {show.disc ? (
        <span className="absolute top-2 right-2 bg-ink px-1.5 py-0.5 text-[11px] font-bold text-paper">
          Disc {show.disc}
        </span>
      ) : null}
      <NowPlayingMark showHref={show.href} className="absolute right-2 bottom-8 text-crank" />
    </div>
  );
}

export function BandCard({ band, priority }: { band: BandModel; priority?: boolean }) {
  const years = yearSpan(band.firstDate, band.lastDate);
  return (
    <Link href={`/bands/${encodeURIComponent(band.id)}`} className="group block min-w-0 outline-offset-4">
      <BandArt
        name={band.name}
        image={band.image}
        palette={band.palette}
        priority={priority}
        className="transition-transform duration-150 ease-out group-hover:-translate-y-0.5"
      />
      <span className="mt-2.5 flex items-center justify-between gap-2">
        <span className="poster truncate text-[24px] leading-none group-hover:text-crank">{band.name}</span>
        <NowPlayingMark bandId={band.id} className="shrink-0 text-crank" />
      </span>
      <span className="tnum mt-1 block text-[13px] text-dust">
        {plural(band.showCount, 'tape')}
        {years ? `, ${years}` : ''}
      </span>
    </Link>
  );
}

export function SectionHead({
  title,
  href,
  linkLabel,
  id,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 border-b-2 border-paper pb-1.5">
      <h2 id={id} className="poster text-[34px] sm:text-[40px]">
        {title}
      </h2>
      {href ? (
        <Link href={href} className="pb-1 text-[13px] font-semibold text-dust underline-offset-4 hover:text-paper hover:underline">
          {linkLabel ?? 'See all'}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * A band's discography as flyer lines: date set big, venue, then the facts.
 * The row is one link to the show; the venue is its own link above it.
 */
export function ShowRows({ shows }: { shows: ShowModel[] }) {
  return (
    <ol className="border-t border-rule">
      {shows.map((show) => {
        const label = [shortDate(show.date), show.venue ?? show.title].filter(Boolean).join(' ');
        return (
          <li
            key={show.key}
            className="group relative grid grid-cols-[7.25rem_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-rule py-2.5 hover:bg-tape has-[a.card-link:focus-visible]:outline-2 has-[a.card-link:focus-visible]:outline-offset-[-2px] has-[a.card-link:focus-visible]:outline-crank sm:grid-cols-[10rem_minmax(0,1fr)_auto]"
          >
            <Link
              href={show.href}
              aria-label={label}
              className="card-link poster pl-2 text-[27px] leading-none whitespace-nowrap outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-crank sm:text-[36px] tnum"
            >
              {shortDate(show.date) ?? '?'}
            </Link>
            <span className="min-w-0">
              {show.venueSlug ? (
                <Link
                  href={venueHref(show.venueSlug)}
                  className="relative z-10 block truncate font-display text-[20px] leading-tight font-extrabold uppercase underline-offset-2 hover:underline"
                >
                  {show.venue}
                </Link>
              ) : (
                <span className="block truncate font-display text-[20px] leading-tight font-extrabold text-paper/70 uppercase">
                  {show.venue ?? 'Venue unknown'}
                </span>
              )}
              <span className="block truncate text-[13px] text-dust">
                {[longDate(show.date), show.disc ? `Disc ${show.disc}` : null, show.note].filter(Boolean).join(', ')}
              </span>
            </span>
            <span className="flex items-center gap-4 pr-3 text-[13px] text-dust tnum">
              <NowPlayingMark showHref={show.href} className="text-crank" />
              <span>{plural(show.trackCount, 'track')}</span>
              <span className="hidden w-16 text-right sm:block">{formatRunTime(show.duration)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
