import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Pages anyone can open without an account (auth flow + things link-preview bots fetch).
const PUBLIC = [/^\/login$/, /^\/signup$/, /^\/auth\//, /^\/(opengraph|twitter)-image/, /^\/manifest\.json$/, /^\/robots\.txt$/];

// Everyone listens with an account: refresh the Supabase session, and send anyone without one to sign up.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC.some((re) => re.test(pathname));
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));

  let user = null;
  if (hasSession) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (toSet) => {
            for (const { name, value } of toSet) request.cookies.set(name, value);
            response = NextResponse.next({ request });
            for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
          },
        },
      },
    );
    ({ data: { user } } = await supabase.auth.getUser());
  }

  if (!user && !isPublic) {
    // Server Action / API calls get a 401 instead of an HTML redirect.
    if (request.method !== 'GET') return new NextResponse(null, { status: 401 });
    const to = new URL('/signup', request.url);
    if (pathname !== '/') to.searchParams.set('next', pathname + search);
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|logo\\d+\\.png|fonts/|images/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)'],
};
