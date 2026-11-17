/* eslint-disable @next/next/no-img-element -- avatars are Supabase Storage URLs; plain <img> keeps them off the image optimizer allow-list. */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCatalog } from '@/lib/catalog';
import { getDiggers, getPlayStats, type Digger } from '@/lib/leaderboard';
import { getProfileByHandle, songsNamedBy, tapesUploadedBy, type NamedSong, type UploadedTape } from '@/lib/profiles';
import { fountain, longDate, paletteFor, plural } from '@/lib/shows';
import { currentUser } from '@/lib/supabase/server';

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const profile = await getProfileByHandle(decodeURIComponent((await params).handle));
  return { title: profile ? `${profile.name} (@${profile.handle})` : 'Profile' };
}

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

/** A listener's public page: who they are, how hard they crank, and what they've added to the garden. */
export default async function ProfilePage({ params }: Params) {
  const handle = decodeURIComponent((await params).handle);
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [user, catalog, stats, diggers, named, tapes] = await Promise.all([
    currentUser().catch(() => null),
    getCatalog(),
    getPlayStats().catch(() => null),
    getDiggers().catch((): Digger[] => []),
    songsNamedBy(profile.id).catch((): NamedSong[] => []),
    tapesUploadedBy(profile.id).catch((): UploadedTape[] => []),
  ]);
  const isMe = user?.id === profile.id;
  const listener = stats?.listeners.find((l) => l.userId === profile.id) ?? null;
  const crankRank = listener ? stats!.listeners.indexOf(listener) + 1 : null;
  const digger = diggers.find((d) => d.userId === profile.id) ?? null;
  const digRank = digger ? diggers.indexOf(digger) + 1 : null;
  const bandByName = new Map(catalog.bands.map((b) => [b.name, b]));
  const showForUrl = new Map(catalog.tracks.map((t) => [t.url, t.showHref]));
  const palette = paletteFor(profile.handle);

  const statTiles = [
    { label: 'plays', value: listener?.plays ?? 0, note: crankRank ? `#${crankRank} cranker` : null, href: '/leaderboard?board=crankers' },
    { label: 'songs played', value: listener?.songs ?? 0, note: null, href: null },
    { label: 'digger points', value: digger?.points ?? 0, note: digRank ? `#${digRank} digger` : null, href: '/leaderboard?board=diggers' },
    { label: 'tapes uploaded', value: tapes.length, note: null, href: null },
  ];

  return (
    <div className="px-4 pt-5 md:px-8 md:pt-10">
      <header className="flex flex-col gap-5 border-b-[3px] border-paper pb-5 sm:flex-row sm:items-end">
        <div className="h-28 w-28 shrink-0 overflow-hidden sm:h-36 sm:w-36" style={{ backgroundImage: fountain(palette) }}>
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover [filter:sepia(.2)_contrast(1.08)]" />
          ) : (
            <span className="poster flex h-full w-full items-center justify-center text-[64px] text-ink" aria-hidden="true">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="poster break-words text-[clamp(48px,8vw,104px)] leading-[0.82]">{profile.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-dust">
            <span className="font-semibold text-leaf-light">@{profile.handle}</span>
            <span>In the garden since {monthYear(profile.createdAt)}</span>
          </p>
          {profile.bio ? <p className="mt-3 max-w-[60ch] text-[15px] whitespace-pre-line text-paper/90">{profile.bio}</p> : null}
        </div>
        {isMe ? (
          <Link href="/account" className="self-start border border-paper px-3 py-1.5 text-[13px] font-semibold text-paper hover:bg-paper hover:text-ink sm:self-end">
            Edit profile
          </Link>
        ) : null}
      </header>

      <dl className="grid grid-cols-2 border-b border-rule sm:grid-cols-4">
        {statTiles.map((s) => (
          <div key={s.label} className="border-rule py-4 pr-3 odd:border-r sm:border-r sm:last:border-r-0 sm:pl-4 sm:first:pl-0">
            <dt className="text-[12.5px] text-dust">{s.label}</dt>
            <dd className="poster mt-1 text-[40px] leading-none tnum">{s.value.toLocaleString('en-US')}</dd>
            {s.note && s.href ? (
              <Link href={s.href} className="mt-1 inline-block text-[12.5px] font-semibold text-crank hover:underline">
                {s.note}
              </Link>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="top-bands">
          <h2 id="top-bands" className="poster mb-3 border-b-2 border-paper pb-1.5 text-[34px]">
            Cranks most
          </h2>
          {listener?.topBands.length ? (
            <ol className="border-t border-rule">
              {listener.topBands.map(([name, n], i) => {
                const band = bandByName.get(name);
                const row = (
                  <>
                    <span className="w-6 text-[13px] text-dust tnum">{i + 1}</span>
                    <span className="h-6 w-6 shrink-0" style={{ backgroundImage: fountain(band?.palette ?? 0) }} aria-hidden="true" />
                    <span className="poster min-w-0 flex-1 truncate text-[22px] leading-none group-hover:text-crank">{name}</span>
                    <span className="text-[13px] text-dust tnum">{plural(n, 'play')}</span>
                  </>
                );
                return (
                  <li key={name} className="border-b border-rule">
                    {band ? (
                      <Link href={`/bands/${encodeURIComponent(band.id)}`} className="group flex items-center gap-3 py-2.5 pr-2 hover:bg-tape">
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 py-2.5 pr-2">{row}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[15px] text-dust">{isMe ? 'Play something and your bands show up here.' : 'No plays yet.'}</p>
          )}
        </section>

        <section aria-labelledby="named">
          <h2 id="named" className="poster mb-3 border-b-2 border-paper pb-1.5 text-[34px]">
            Songs named
          </h2>
          {named.length ? (
            <ul className="border-t border-rule">
              {named.map((n) => (
                <li key={n.trackId} className="border-b border-rule">
                  <Link href={n.href ?? '#'} className="group block py-2.5 pr-2 hover:bg-tape">
                    <span className="block truncate text-[15px] font-semibold text-paper group-hover:text-crank">{n.title}</span>
                    <span className="block truncate text-[13px] text-dust">{n.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[15px] text-dust">
              {isMe ? (
                <>
                  None yet.{' '}
                  <Link href="/name-these" className="font-semibold text-paper underline underline-offset-4">
                    Help name the untitled cuts
                  </Link>
                  .
                </>
              ) : (
                'None yet.'
              )}
            </p>
          )}
        </section>

        {tapes.length ? (
          <section aria-labelledby="tapes" className="lg:col-span-2">
            <h2 id="tapes" className="poster mb-3 border-b-2 border-paper pb-1.5 text-[34px]">
              Tapes uploaded
            </h2>
            <ul className="grid border-t border-rule sm:grid-cols-2 sm:gap-x-10">
              {tapes.map((t) => {
                const href = t.audioUrl ? showForUrl.get(t.audioUrl) : undefined;
                const body = (
                  <>
                    <span className="block truncate text-[15px] font-semibold text-paper group-hover:text-crank">{t.title}</span>
                    <span className="block truncate text-[13px] text-dust tnum">
                      {[longDate(t.when), plural(t.trackCount, 'track'), `added ${longDate(t.createdAt.slice(0, 10))}`].filter(Boolean).join(' · ')}
                    </span>
                  </>
                );
                return (
                  <li key={t.id} className="border-b border-rule">
                    {href ? (
                      <Link href={href} className="group block py-2.5 pr-2 hover:bg-tape">
                        {body}
                      </Link>
                    ) : (
                      <div className="py-2.5 pr-2">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
