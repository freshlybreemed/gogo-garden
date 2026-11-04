'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useAppStore } from '@/stores/AppStore';
import { usePlayerStore } from '@/stores/PlayerStore';
import { supabaseBrowser } from '@/lib/supabase/client';
import { fountain } from '@/lib/shows';
import { Equalizer } from '../art/Equalizer';
import { IconBands, IconHome, IconPin, IconSearch, IconUser } from '../icons';

export type NavBand = { id: string; name: string; palette: number; showCount: number; isNew: boolean };

const LINKS = [
  { href: '/', label: 'Home', icon: IconHome },
  { href: '/search', label: 'Search', icon: IconSearch },
  { href: '/bands', label: 'Bands', icon: IconBands },
  { href: '/venues', label: 'Venues', icon: IconPin },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/bands') return pathname.startsWith('/bands') || pathname.startsWith('/shows');
  return pathname.startsWith(href);
}

function useAuth(initialLoggedIn: boolean) {
  const stored = useAppStore((s) => s.loggedIn);
  const setLoggedIn = useAppStore((s) => s.setLoggedIn);
  const router = useRouter();
  const loggedIn = stored ?? initialLoggedIn;
  const signOut = async () => {
    await supabaseBrowser().auth.signOut().catch(() => undefined);
    setLoggedIn(false);
    router.refresh();
  };
  return { loggedIn, signOut };
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={clsx('inline-block text-ink outline-offset-4', className)} aria-label="Tha Garden, home">
      <span className="block px-2.5 pt-2 pb-1.5" style={{ backgroundImage: fountain(0, 90) }}>
        <span className="poster block text-[15px] leading-none">Tha</span>
        <span className="poster block text-[34px] leading-[0.82]">Garden</span>
      </span>
    </Link>
  );
}

/** Desktop rail: nav, then every band (the library), then account. */
export function Sidebar({ bands, initialLoggedIn }: { bands: NavBand[]; initialLoggedIn: boolean }) {
  const pathname = usePathname();
  const { loggedIn, signOut } = useAuth(initialLoggedIn);
  const current = usePlayerStore((s) => s.currentTrack);
  const playing = usePlayerStore((s) => s.playing);

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 hidden w-[248px] shrink-0 flex-col border-r border-rule bg-tar md:flex"
      style={{ height: current ? 'calc(100dvh - 88px)' : '100dvh' }}
    >
      <div className="px-5 pt-5 pb-4">
        <Wordmark />
      </div>
      <ul className="px-2">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'relative flex h-11 items-center gap-3 px-3 text-[15px] font-semibold outline-offset-[-2px]',
                  active ? 'text-paper' : 'text-dust hover:text-paper',
                )}
              >
                {active ? <span className="absolute inset-y-2 left-0 w-[3px] bg-leaf" aria-hidden="true" /> : null}
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-rule">
        <h2 className="px-5 pt-4 pb-2 text-[13px] font-semibold text-dust">
          The crates <span className="tnum font-normal">({bands.length})</span>
        </h2>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 [scrollbar-color:var(--color-rule)_transparent] [scrollbar-width:thin]">
          {bands.map((b) => {
            const href = `/bands/${encodeURIComponent(b.id)}`;
            const active = pathname === href;
            const live = current?.bandId === b.id;
            return (
              <li key={b.id}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex h-9 items-center gap-2.5 px-3 text-[14px] outline-offset-[-2px]',
                    active ? 'bg-tape-2 text-paper' : 'text-paper/75 hover:bg-tape hover:text-paper',
                  )}
                >
                  <span
                    className={clsx('h-3.5 w-3.5 shrink-0', b.isNew && 'outline-2 outline-offset-1 outline-leaf')}
                    style={{ backgroundImage: fountain(b.palette) }}
                    aria-hidden="true"
                  />
                  <span className={clsx('min-w-0 flex-1 truncate', (live || b.isNew) && 'text-leaf-light')}>
                    {b.name}
                    {b.isNew ? <span className="sr-only">, new band</span> : null}
                  </span>
                  {live ? (
                    <Equalizer active={playing} className="text-leaf" />
                  ) : (
                    <span className="text-[12px] text-dust tnum">{b.showCount}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-rule px-5 py-3 text-[14px]">
        {loggedIn ? (
          <button type="button" onClick={signOut} className="font-semibold text-dust hover:text-paper">
            Log out
          </button>
        ) : (
          <span className="flex gap-4">
            <Link href="/login" className="font-semibold text-paper hover:text-crank">
              Log in
            </Link>
            <Link href="/signup" className="text-dust hover:text-paper">
              Sign up
            </Link>
          </span>
        )}
      </div>
    </nav>
  );
}

/** Phone: slim top bar with the wordmark + account. */
export function MobileTop({ initialLoggedIn }: { initialLoggedIn: boolean }) {
  const { loggedIn, signOut } = useAuth(initialLoggedIn);
  return (
    <header className="flex items-center justify-between px-4 pt-3 md:hidden">
      <Wordmark className="scale-90 origin-left" />
      {loggedIn ? (
        <button type="button" onClick={signOut} className="h-11 px-1 text-[14px] font-semibold text-dust hover:text-paper">
          Log out
        </button>
      ) : (
        <Link href="/login" className="inline-flex h-11 items-center gap-2 px-1 text-[14px] font-semibold text-paper">
          <IconUser className="h-5 w-5" />
          Log in
        </Link>
      )}
    </header>
  );
}

/** Phone: bottom tab bar (sits under the mini player). */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-tar pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid h-14 grid-cols-4">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'relative flex h-full flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold outline-offset-[-2px]',
                  active ? 'text-paper' : 'text-dust',
                )}
              >
                {active ? <span className="absolute inset-x-6 top-0 h-[3px] bg-leaf" aria-hidden="true" /> : null}
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bottom padding so content clears the fixed player + tab bar. */
export function MainPad({ children }: { children: React.ReactNode }) {
  const hasTrack = usePlayerStore((s) => Boolean(s.currentTrack));
  return (
    <div
      className={clsx(
        'min-w-0 flex-1',
        hasTrack ? 'pb-[calc(56px+64px+24px+env(safe-area-inset-bottom))] md:pb-[120px]' : 'pb-[calc(56px+24px+env(safe-area-inset-bottom))] md:pb-12',
      )}
    >
      {children}
    </div>
  );
}
