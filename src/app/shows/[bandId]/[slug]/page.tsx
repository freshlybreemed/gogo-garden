import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SectionHead, ShowCard } from '@/components/cards';
import { BandArt } from '@/components/art/BandArt';
import { PlayButton } from '@/components/PlayButton';
import { TrackList } from '@/components/TrackList';
import { TitleEditor } from '@/components/edit/TitleEditor';
import { currentUser } from '@/lib/supabase/server';
import { getCatalog } from '@/lib/catalog';
import { formatRunTime, fountain, longDate, plural, shortDate, trackTitle, venueHref } from '@/lib/shows';

type Params = { params: Promise<{ bandId: string; slug: string }> };

async function findShow({ params }: Params) {
  const { bandId, slug } = await params;
  const catalog = await getCatalog();
  const href = `/shows/${encodeURIComponent(decodeURIComponent(bandId))}/${slug}`;
  const show = catalog.showByHref.get(href);
  return { catalog, show, tracks: show ? (catalog.tracksByShow.get(show.href) ?? []) : [] };
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { show } = await findShow(props);
  if (!show) return { title: 'Show not found' };
  return { title: `${show.bandName} ${[shortDate(show.date), show.venue ?? show.title].filter(Boolean).join(' ')}` };
}

export default async function ShowPage(props: Params) {
  const [{ catalog, show, tracks }, user] = await Promise.all([findShow(props), currentUser()]);
  if (!show) notFound();

  const bandHref = `/bands/${encodeURIComponent(show.bandId)}`;
  const dated = show.kind === 'live' && show.date;
  const others = (catalog.showsByBand.get(show.bandId) ?? []).filter((s) => s.href !== show.href);
  // Neighbours in time: the shows either side of this one.
  const at = (catalog.showsByBand.get(show.bandId) ?? []).findIndex((s) => s.href === show.href);
  const nearby = others.slice(Math.max(0, at - 2), Math.max(0, at - 2) + 4);
  const source = `${show.bandName} ${[shortDate(show.date), show.venue ?? show.title].filter(Boolean).join(' ')}`;

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      {/* The J-card, unfolded. */}
      <header className="flex flex-col text-ink sm:flex-row">
        <Link
          href={bandHref}
          className="flex items-center px-4 py-3 sm:w-20 sm:justify-center sm:px-0 sm:py-5"
          style={{ backgroundImage: fountain(show.palette) }}
        >
          <span className="poster text-[30px] sm:text-[40px] sm:[writing-mode:vertical-rl] sm:rotate-180">
            {show.bandName}
          </span>
        </Link>
        <div className="paper min-w-0 flex-1 border-t-2 border-dashed border-ink/30 px-5 pt-4 pb-5 sm:border-t-0 sm:border-l-2 md:px-8 md:pt-6">
          <p className="font-display text-[17px] font-extrabold uppercase">
            {show.kind === 'live' ? 'Live show' : 'Studio / mixtape'}
            {!show.date && show.year ? `, ${show.year}` : ''}
            {show.disc ? `, disc ${show.disc}` : ''}
          </p>
          {dated ? (
            <h1 className="mt-1">
              <span className="poster block text-[clamp(72px,14vw,168px)] leading-[0.8] tracking-tight">
                {shortDate(show.date)}
              </span>
              {show.venueSlug ? (
                <Link
                  href={venueHref(show.venueSlug)}
                  className="mt-2 block font-display text-[clamp(26px,4vw,48px)] leading-[0.95] font-black uppercase decoration-[3px] underline-offset-4 hover:underline"
                >
                  {show.venue}
                </Link>
              ) : show.venue ? (
                <span className="mt-2 block font-display text-[clamp(26px,4vw,48px)] leading-[0.95] font-black uppercase">
                  {show.venue}
                </span>
              ) : null}
            </h1>
          ) : (
            <h1 className="poster mt-1 text-[clamp(48px,8vw,112px)] leading-[0.85]">{show.title}</h1>
          )}
          {show.note ? <p className="mt-2 text-[16px] italic">{show.note}</p> : null}
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink/30 pt-2 text-[14px] font-medium tnum">
            {show.date ? <span>{longDate(show.date)}</span> : null}
            <span>{plural(show.trackCount, 'track')}</span>
            <span>{formatRunTime(show.duration)}</span>
            {show.streams ? <span>{plural(show.streams, 'play')}</span> : null}
          </p>
        </div>
        {show.image ? (
          <BandArt
            name={show.bandName}
            image={show.image}
            palette={show.palette}
            className="hidden shrink-0 self-start sm:block sm:w-56 lg:w-72"
            priority
          />
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-6">
        <PlayButton tracks={tracks} source={source} label="Play show" />
        <Link href={bandHref} className="text-[14px] font-semibold text-dust underline-offset-4 hover:text-paper hover:underline">
          More {show.bandName}
        </Link>
        {show.venueSlug ? (
          <Link
            href={venueHref(show.venueSlug)}
            className="text-[14px] font-semibold text-dust underline-offset-4 hover:text-paper hover:underline"
          >
            Every night at {show.venue}
          </Link>
        ) : null}
      </div>

      <section aria-label="Tracks">
        <TrackList tracks={tracks} variant="show" source={source} />
        <p className="mt-3 max-w-[60ch] text-[13px] text-dust">
          {tracks.some((t) => t.part !== null)
            ? 'PA tapes run as one long set, so untitled cuts are numbered by their place on the tape.'
            : `Original album name: ${show.album}`}
        </p>
        <TitleEditor
          showHref={show.href}
          signedIn={Boolean(user)}
          tracks={tracks.map((t, i) => ({ id: t.id, position: i + 1, title: t.part !== null ? '' : trackTitle(t), placeholder: t.part !== null }))}
        />
      </section>

      {nearby.length ? (
        <section aria-labelledby="more" className="mt-12">
          <SectionHead id="more" title={`More from ${show.bandName}`} href={bandHref} linkLabel="All shows" />
          <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {nearby.map((s) => (
              <li key={s.key}>
                <ShowCard show={s} hideBand />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
