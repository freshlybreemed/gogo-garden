import type { Metadata, Viewport } from 'next';
import { Archivo, Big_Shoulders, Permanent_Marker } from 'next/font/google';
import './globals.css';
import Player from '@/components/player';
import { MainPad, MobileTop, Sidebar, TabBar, type NavBand } from '@/components/shell/Nav';
import { currentUser } from '@/lib/supabase/server';
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
  metadataBase: new URL('https://thegogogarden.com'),
  title: { default: 'GoGo Garden', template: '%s – GoGo Garden' },
  description: 'Live from the go-go: DC go-go PA tapes, streaming.',
  applicationName: 'GoGo Garden',
  appleWebApp: { title: 'GoGo Garden', capable: true, statusBarStyle: 'black-translucent' },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#17120d',
  viewportFit: 'cover',
};

// Stream counts change constantly and login state comes from a cookie.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = Boolean(await currentUser().catch(() => null));
  let bands: NavBand[] = [];
  try {
    const catalog = await getCatalog();
    bands = catalog.bands
      .filter((b) => b.trackCount > 0)
      .map((b) => ({ id: b.id, name: b.name, palette: b.palette, showCount: b.showCount, isNew: b.isNew }));
  } catch (err) {
    // Pages render their own error state; the shell still works.
    console.error(err);
  }

  return (
    <html lang="en" className={`${poster.variable} ${grotesk.variable} ${marker.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only bg-crank px-3 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-[max(8px,env(safe-area-inset-top))] focus:left-2 focus:z-[60]"
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
        <Player initialLoggedIn={loggedIn} />
        <TabBar />
      </body>
    </html>
  );
}
