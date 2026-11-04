import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Archivo, Big_Shoulders, Permanent_Marker } from 'next/font/google';
import './globals.css';
import Player from '@/components/player';
import { MainPad, MobileTop, Sidebar, TabBar, type NavBand } from '@/components/shell/Nav';
import { AUTH_COOKIE } from '@/lib/helpers';
import { getCatalog } from '@/lib/catalog';

const poster = Big_Shoulders({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-poster',
  adjustFontFallback: false,
  display: 'swap',
});

const grotesk = Archivo({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

// Only for memories on venue pages: words scrawled on the flyer.
const marker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-scrawl',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Tha Garden', template: '%s – Tha Garden' },
  description: 'Live go-go PA tapes from DC bands, streaming.',
  icons: { icon: '/favicon.ico', apple: '/logo192.png' },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#14120e',
  viewportFit: 'cover',
};

// Stream counts change constantly and login state comes from a cookie.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = Boolean((await cookies()).get(AUTH_COOKIE)?.value);
  let bands: NavBand[] = [];
  try {
    const catalog = await getCatalog();
    bands = catalog.bands
      .filter((b) => b.trackCount > 0)
      .map((b) => ({ id: b.id, name: b.name, palette: b.palette, showCount: b.showCount }));
  } catch (err) {
    // Pages render their own error state; the shell still works.
    console.error(err);
  }

  return (
    <html lang="en" className={`${poster.variable} ${grotesk.variable} ${marker.variable}`}>
      <body>
        <a
          href="#main"
          className="fixed top-2 left-2 z-[60] -translate-y-20 bg-crank px-3 py-2 font-semibold text-ink focus:translate-y-0"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <Sidebar bands={bands} initialLoggedIn={loggedIn} />
          <MainPad>
            <MobileTop initialLoggedIn={loggedIn} />
            <main id="main">{children}</main>
          </MainPad>
        </div>
        <Player />
        <TabBar />
      </body>
    </html>
  );
}
