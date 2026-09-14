import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Session refresh + route guard.
 *
 * Hardened deliberately: middleware runs on EVERY request, so anything that throws
 * here takes down the entire site — including the marketing pages, which have no
 * business depending on Supabase. Misconfiguration should degrade to "logged out",
 * never to a 500.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const isProtected = request.nextUrl.pathname.startsWith('/app');

  // No credentials: let public pages render, send protected routes to login.
  if (!CONFIGURED) {
    if (isProtected) return redirectToLogin(request, 'not-configured');
    return response;
  }

  try {
    let out = response;

    const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          out = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => out.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user && isProtected) return redirectToLogin(request);
    return out;
  } catch (error) {
    // Network blip, bad key, Supabase outage — none of these should 500 the site.
    console.error('[middleware] auth check failed:', error);
    if (isProtected) return redirectToLogin(request, 'auth-unavailable');
    return response;
  }
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', request.nextUrl.pathname);
  if (reason) url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}

/**
 * Scoped to what actually needs it. Running on every path was what turned a missing
 * env var into a site-wide outage.
 */
export const config = {
  matcher: ['/app/:path*', '/login'],
};