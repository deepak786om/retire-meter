import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface KiteHolding {
  tradingsymbol: string; quantity: number;
  average_price: number; last_price: number; pnl: number;
}

/**
 * Step 3. Pull holdings and diff against what we had.
 *
 * Kite gives us VALUE, not CONTRIBUTION. If equity moves from 18L to 19L we cannot
 * tell whether you invested 60k or the market rose 1L — and that distinction is the
 * whole basis of plan-versus-actual. So sync updates valuations only; the ledger
 * stays the single source of truth for what you actually put in.
 *
 * Note also: the simple return Kite implies, (last - average) / average, is time
 * blind. For a SIP bought over three years it is not a return at all. Proper XIRR
 * needs dated cash flows, which holdings alone do not carry.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { data: conn } = await supabase
    .from('broker_connections').select('*').eq('id', user.id).single();

  if (!conn?.access_token || new Date(conn.token_expires_at ?? 0) < new Date()) {
    return NextResponse.json(
      { error: 'reauth_required',
        message: 'Zerodha clears the session each morning. One tap to reconnect.' },
      { status: 401 }
    );
  }

  const res = await fetch('https://api.kite.trade/portfolio/holdings', {
    headers: {
      'X-Kite-Version': '3',
      Authorization: `token ${process.env.KITE_API_KEY}:${conn.access_token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ error: 'reauth_required' }, { status: 401 });

  const { data } = (await res.json()) as { data: KiteHolding[] };

  const { data: existing } = await supabase
    .from('holdings').select('label,current_value')
    .eq('user_id', user.id).eq('source', 'broker_sync');
  const previousTotal = (existing ?? []).reduce((a, h) => a + Number(h.current_value), 0);

  const rows = data.map((h) => ({
    user_id: user.id,
    instrument_key: 'st',
    label: h.tradingsymbol,
    invested: h.quantity * h.average_price,
    current_value: h.quantity * h.last_price,
    source: 'broker_sync' as const,
    last_synced_at: new Date().toISOString(),
  }));

  for (const row of rows) {
    await supabase.from('holdings').upsert(row, { onConflict: 'user_id,label' });
  }

  const value = rows.reduce((a, r) => a + r.current_value, 0);
  const summary = {
    positions: rows.length,
    invested: rows.reduce((a, r) => a + r.invested, 0),
    value,
    changeSinceLastSync: previousTotal ? value - previousTotal : null,
    syncedAt: new Date().toISOString(),
  };

  await supabase.from('broker_connections')
    .update({ last_synced_at: summary.syncedAt, last_sync_summary: summary })
    .eq('id', user.id);

  return NextResponse.json(summary);
}
