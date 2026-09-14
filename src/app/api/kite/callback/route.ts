import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

/**
 * Step 2. Zerodha redirects here with a one-time request_token valid for a couple
 * of minutes, exchanged for a day-long access_token.
 *
 * The checksum is SHA-256(api_key + request_token + api_secret). The secret must
 * NEVER reach the browser — which is exactly why this runs server-side.
 */
export async function GET(request: NextRequest) {
  const requestToken = request.nextUrl.searchParams.get('request_token');
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  if (!requestToken || !apiKey || !apiSecret) {
    return NextResponse.redirect(new URL('/app/portfolio?sync=failed', request.url));
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const checksum = createHash('sha256').update(apiKey + requestToken + apiSecret).digest('hex');

  const res = await fetch('https://api.kite.trade/session/token', {
    method: 'POST',
    headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }),
  });
  if (!res.ok) return NextResponse.redirect(new URL('/app/portfolio?sync=failed', request.url));

  const { data } = await res.json();

  // Tokens die at the next ~7am flush. Storing the expiry lets the UI prompt a
  // re-auth instead of silently showing stale holdings as though they were live.
  const expiry = new Date();
  expiry.setHours(7, 30, 0, 0);
  if (expiry <= new Date()) expiry.setDate(expiry.getDate() + 1);

  await supabase.from('broker_connections').upsert({
    id: user.id, provider: 'zerodha',
    access_token: data.access_token,
    token_expires_at: expiry.toISOString(),
  });

  return NextResponse.redirect(new URL('/app/portfolio?sync=ok', request.url));
}
