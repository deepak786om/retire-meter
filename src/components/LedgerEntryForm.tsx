'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { INSTRUMENTS } from '@/lib/engine/defaults';
import { fdMaturity } from '@/lib/engine/instruments';
import { rupees } from '@/lib/format';

/**
 * Conditional by instrument.
 *
 * A fixed deposit has no scheme name and no direct/regular plan; a PPF needs its
 * account opening date because that sets the maturity year, which decides which
 * goals it is legally allowed to fund. One static form for every instrument is the
 * commonest way these apps collect the wrong data.
 */

type EntryType = 'contribution' | 'withdrawal' | 'transfer' | 'rate_change';

interface Spec {
  label: string;
  instrumentKey: string;
  fields: Field[];
  tag: string;
}
type Field =
  | 'scheme' | 'plan' | 'option' | 'mode' | 'folio'
  | 'symbol' | 'quantity' | 'price'
  | 'bank' | 'rate' | 'startDate' | 'tenure' | 'compounding' | 'payout' | 'autoRenew'
  | 'openedOn' | 'basicPay' | 'employeeShare' | 'tier' | 'pfm';

const SPECS: Record<string, Spec> = {
  mf: { label: 'Mutual fund — equity', instrumentKey: 'eq',
    fields: ['scheme', 'plan', 'option', 'mode', 'folio'],
    tag: 'Equity is eligible for goals seven or more years out and retirement. It will not count towards anything inside three years.' },
  elss: { label: 'ELSS (3-year lock)', instrumentKey: 'eq',
    fields: ['scheme', 'plan', 'option', 'mode'],
    tag: 'Locked for three years from each instalment, not from your first investment.' },
  stocks: { label: 'Direct stocks', instrumentKey: 'st',
    fields: ['symbol', 'quantity', 'price'],
    tag: 'Tagged to long-horizon goals and retirement.' },
  fd: { label: 'Fixed deposit', instrumentKey: 'fd',
    fields: ['bank', 'rate', 'startDate', 'tenure', 'compounding', 'payout', 'autoRenew'],
    tag: 'Capital-protected, so this funds goals inside three years first. It terminates at maturity and the money must be redeployed.' },
  ppf: { label: 'PPF', instrumentKey: 'ppf',
    fields: ['openedOn'],
    tag: 'Maturity is fifteen years from the opening date. Interest is credited on the lowest balance between the 5th and month end, so contribute before the 5th.' },
  epf: { label: 'EPF / VPF', instrumentKey: 'epf',
    fields: ['basicPay', 'employeeShare'],
    tag: 'Locked until 58. Tagged to retirement only — it cannot fund your house or car.' },
  nps: { label: 'NPS', instrumentKey: 'nps',
    fields: ['tier', 'pfm'],
    tag: 'Tier I is locked to 60, and 40% is forced into an annuity at that point. Tier II has no lock-in and no extra deduction.' },
  gold: { label: 'Gold / SGB', instrumentKey: 'gold', fields: [],
    tag: 'The three-to-seven year middle.' },
  cash: { label: 'Cash / liquid', instrumentKey: 'cash', fields: [],
    tag: 'Buffer and immediate needs.' },
};

export function LedgerEntryForm() {
  const router = useRouter();
  const [type, setType] = useState<EntryType>('contribution');
  const [specKey, setSpecKey] = useState('mf');
  const [amount, setAmount] = useState(25_000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState(6.25);
  const [tenure, setTenure] = useState(1);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spec = SPECS[specKey];
  const show = (f: Field) => spec.fields.includes(f);

  const maturity = specKey === 'fd' && amount > 0
    ? fdMaturity(amount, rate / 100, tenure, 4) : null;

  async function save() {
    setBusy(true); setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in.'); setBusy(false); return; }

    const { error } = await supabase.from('ledger_entries').insert({
      user_id: user.id,
      entry_date: date,
      type,
      instrument_key: spec.instrumentKey,
      label: label || spec.label,
      // Withdrawals are stored negative so the ledger sums correctly without
      // special-casing sign at every read site.
      amount: type === 'withdrawal' ? -Math.abs(amount) : amount,
    });

    setBusy(false);
    if (error) { setError(error.message); return; }
    router.push('/app/log');
    router.refresh();
  }

  return (
    <div className="max-w-[560px]">
      <div className="mb-5 flex flex-wrap gap-2">
        {(['contribution', 'withdrawal', 'transfer', 'rate_change'] as EntryType[]).map((t) => (
          <button key={t} onClick={() => setType(t)} aria-pressed={t === type}
            className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold capitalize transition ${
              t === type ? 'border-transparent bg-secondary-container text-secondary-on'
                         : 'border-ink-outline text-ink-variant'}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Label text="Instrument">
        <select value={specKey} onChange={(e) => setSpecKey(e.target.value)} className="m3-field !pt-3">
          <optgroup label="Equity">
            <option value="mf">Mutual fund — equity</option>
            <option value="elss">ELSS (3-year lock)</option>
            <option value="stocks">Direct stocks</option>
          </optgroup>
          <optgroup label="Fixed income">
            <option value="fd">Fixed deposit</option>
          </optgroup>
          <optgroup label="Retirement — locked">
            <option value="epf">EPF / VPF</option>
            <option value="ppf">PPF</option>
            <option value="nps">NPS</option>
          </optgroup>
          <optgroup label="Other">
            <option value="gold">Gold / SGB</option>
            <option value="cash">Cash / liquid</option>
          </optgroup>
        </select>
      </Label>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Label text="Amount">
          <input inputMode="numeric" value={amount.toLocaleString('en-IN')}
                 onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                 className="m3-field !pt-3" />
        </Label>
        <Label text="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="m3-field !pt-3" />
        </Label>
      </div>

      {show('scheme') && (
        <Label text="Scheme">
          <input value={label} onChange={(e) => setLabel(e.target.value)}
                 placeholder="Parag Parikh Flexi Cap" className="m3-field !pt-3" />
        </Label>
      )}

      {show('plan') && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Label text="Plan">
            <select className="m3-field !pt-3"><option>Direct</option><option>Regular</option></select>
          </Label>
          <Label text="Mode">
            <select className="m3-field !pt-3"><option>SIP — monthly</option><option>Lumpsum</option></select>
          </Label>
        </div>
      )}

      {show('symbol') && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Label text="Symbol">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="INFY" className="m3-field !pt-3" />
          </Label>
          <Label text="Quantity"><input inputMode="numeric" defaultValue={25} className="m3-field !pt-3" /></Label>
        </div>
      )}

      {show('bank') && (
        <>
          <Label text="Bank">
            <input value={label} onChange={(e) => setLabel(e.target.value)}
                   placeholder="State Bank of India" className="m3-field !pt-3" />
          </Label>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Label text="Interest rate you were given">
              <input inputMode="decimal" value={rate}
                     onChange={(e) => setRate(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                     className="m3-field !pt-3" />
            </Label>
            <Label text="Tenure">
              <select value={tenure} onChange={(e) => setTenure(Number(e.target.value))} className="m3-field !pt-3">
                <option value={1}>1 year</option><option value={2}>2 years</option>
                <option value={3}>3 years</option><option value={5}>5 years</option>
              </select>
            </Label>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Label text="Compounding">
              <select className="m3-field !pt-3">
                <option>Quarterly</option><option>Monthly</option>
                <option>Half-yearly</option><option>Annual</option>
              </select>
            </Label>
            <Label text="Auto-renew">
              <select className="m3-field !pt-3">
                <option>No — ask me at maturity</option><option>Yes</option>
              </select>
            </Label>
          </div>
        </>
      )}

      {show('openedOn') && (
        <Label text="Account opened on">
          <input type="date" defaultValue="2019-04-08" className="m3-field !pt-3" />
        </Label>
      )}

      {show('basicPay') && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Label text="Monthly basic pay"><input inputMode="numeric" defaultValue="80,000" className="m3-field !pt-3" /></Label>
          <Label text="Employee share %"><input inputMode="decimal" defaultValue="12" className="m3-field !pt-3" /></Label>
        </div>
      )}

      {show('tier') && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Label text="Tier">
            <select className="m3-field !pt-3"><option>Tier I</option><option>Tier II</option></select>
          </Label>
          <Label text="Pension fund manager">
            <select className="m3-field !pt-3">
              <option>HDFC Pension</option><option>SBI Pension</option>
              <option>ICICI Pru Pension</option><option>UTI Retirement</option>
            </select>
          </Label>
        </div>
      )}

      <p className="mb-5 rounded-2xl bg-primary-container px-4 py-3.5 text-[12.5px] leading-relaxed text-primary-on">
        <b>Smart-tagged:</b> {spec.tag}
        {maturity && (
          <> At {rate}% compounded quarterly this matures at <b>{rupees(maturity)}</b> in{' '}
          {tenure} year{tenure > 1 ? 's' : ''} — {rupees(maturity - amount)} of interest. Tax on that
          is added to your income and paid from salary, not taken out of the deposit.</>
        )}
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-container px-4 py-3 text-[12.5px] text-danger-on">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button onClick={save} disabled={busy} className="m3-btn-filled flex-1">
          {busy ? 'Saving…' : 'Save entry'}
        </button>
        <button onClick={() => router.back()} className="m3-btn-text">Cancel</button>
      </div>
    </div>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[11px] font-semibold text-ink-variant">{text}</span>
      {children}
    </label>
  );
}
