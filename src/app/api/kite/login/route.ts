import { NextResponse } from 'next/server';

/**
 * Step 1 of the Kite login. We only build the URL — the user authenticates on
 * Zerodha's own page and we never see their credentials.
 *
 * Zerodha flushes access tokens every morning around 7am and the exchange requires
 * a manual login once a day, so there is no refresh token. Automating it works
 * against the rules and breaks. Sync-on-login is the correct pattern.
 */
export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Kite is not configured.' }, { status: 501 });
  return NextResponse.redirect(`https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`);
}
