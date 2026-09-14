'use client';

import { useState } from 'react';
import type { PlanInput } from '@/lib/engine/types';
import type { MonthCell } from '@/lib/loadPlan';
import { buildPlan, goalCostAtTarget } from '@/lib/engine/projection';
import { AllocationTable } from './AllocationTable';
import { LifeChart } from './charts/LifeChart';
import { GOAL_META } from '@/lib/engine/defaults';
import { INDIA_2026_27 } from '@/lib/engine/rulepacks/india-2026-27';
import { inr, rupees, pct, FY_MONTHS, fyLabel } from '@/lib/format';

type Section = 'plan' | 'log' | 'portfolio' | 'later' | 'assumptions';

const TITLES: Record<Section, [string, string]> = {
  plan:        ['The plan', 'Change one milestone and everything re-solves.'],
  log:         ['Contribution log', 'Contributions, withdrawals, transfers and rate changes — one ledger, everything flows from it.'],
  portfolio:   ['Portfolio', 'Synced holdings plus everything you enter by hand.'],
  later:       ['Later', 'The years after you stop working. Nothing else in India models this.'],
  assumptions: ['Assumptions & rules', 'Nothing is hardcoded. Every number carries a source and a date.'],
};

export function AppSection({ section, input: initial, months }: {
  section: Section; input: PlanInput; months: MonthCell[];
}) {
  const [input, setInput] = useState(initial);
  const [title, lede] = TITLES[section];
  const plan = buildPlan(input);

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[22px] font-bold md:text-[28px]">{title}</h1>
        <p className="mt-1 text-sm text-ink-variant">{lede}</p>
      </header>

      {section === 'plan' && (
        <>
          <section className="m3-card-elevated mb-4">
            <h2 className="text-base font-bold">Your money across your life</h2>
            <p className="mb-4 mt-1 text-xs text-ink-variant">
              Each dip is a milestone paid for. The fall after retirement is the corpus doing its job.
            </p>
            <LifeChart rows={plan.rows} required={plan.corpusRequired} input={input} />
          </section>
          <div className="mb-4"><AllocationTable input={input} onChange={setInput} /></div>
          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {input.goals.map((g) => {
              const years = g.targetAge - input.profile.currentAge;
              const then = goalCostAtTarget(g, input.profile.currentAge);
              const have = Math.max(0, plan.rows.find((r) => r.age === g.targetAge - 1)?.closingCorpus ?? 0);
              const funded = Math.min(100, Math.round((have / then) * 100));
              const tone = funded >= 100 ? 'bg-secondary' : funded >= 65 ? 'bg-warn' : 'bg-danger';
              return (
                <article key={g.id} className="m3-card-elevated">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-container text-lg">
                      {GOAL_META[g.kind].emoji}
                    </span>
                    <span>
                      <span className="block text-[15px] font-bold">{g.name}</span>
                      <span className="block text-[11.5px] text-ink-variant">
                        age {g.targetAge} · {years} yrs away
                      </span>
                    </span>
                  </div>
                  <div className="mb-2 h-2 overflow-hidden rounded bg-surface-3">
                    <div className={`h-full rounded ${tone}`} style={{ width: `${funded}%` }} />
                  </div>
                  <p className="flex justify-between text-xs text-ink-variant">
                    <span>costs <b className="text-ink">{inr(then)}</b> by then</span>
                    <span className="font-bold">{funded >= 100 ? 'Funded' : `${funded}%`}</span>
                  </p>
                </article>
              );
            })}
          </section>
        </>
      )}

      {section === 'log' && <LogView months={months} />}

      {section === 'portfolio' && (
        <>
          <section className="m3-card-elevated mb-4">
            <h2 className="text-base font-bold">Holdings</h2>
            <p className="mb-4 mt-1 text-xs text-ink-variant">
              Rates marked contractual are facts. Assumed rates are judgements you can change on the Plan tab.
            </p>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-ink-line text-[11px] font-bold text-ink-variant">
                  <th className="pb-2.5 text-left">Instrument</th>
                  <th className="pb-2.5 text-left">Rate</th>
                  <th className="pb-2.5 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {input.holdings.map((h) => {
                  const inst = input.instruments[h.key];
                  if (!inst) return null;
                  return (
                    <tr key={h.key} className="border-b border-ink-line last:border-0">
                      <td className="py-3">
                        <span className="block font-semibold">{inst.label}</span>
                        <span className="block text-[11.5px] text-ink-variant">{inst.source}</span>
                      </td>
                      <td className="py-3">
                        {pct(inst.rate)}{' '}
                        <span className={`ml-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                          inst.rateKind === 'contractual'
                            ? 'bg-secondary-container text-secondary-on'
                            : 'bg-warn-container text-warn-on'}`}>
                          {inst.rateKind === 'contractual' ? 'CONTRACTUAL' : 'ASSUMED'}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold tabular-nums">{rupees(h.value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="m3-card-elevated">
            <h2 className="text-base font-bold">Zerodha</h2>
            <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-variant">
              Kite clears the session every morning around 7am and the exchange requires a manual login
              once a day, so there is no background sync. One tap when you open the app.
            </p>
            <form action="/api/kite/login"><button className="m3-btn-tonal">↻ Sync now</button></form>
          </section>
        </>
      )}

      {section === 'later' && <LaterView input={input} />}

      {section === 'assumptions' && (
        <section className="m3-card-elevated">
          <h2 className="text-base font-bold">India · {INDIA_2026_27.financialYear}</h2>
          <p className="mb-4 mt-1 text-xs text-ink-variant">
            Published {INDIA_2026_27.publishedOn}. Rules live in data, effective-dated — publishing a new
            year is an insert, never an edit.
          </p>
          <table className="w-full text-[13.5px]">
            <tbody>
              {Object.entries(INDIA_2026_27.statutoryRates).map(([key, v]) => (
                <tr key={key} className="border-b border-ink-line last:border-0">
                  <td className="py-3 font-semibold uppercase">{key}</td>
                  <td className="py-3 font-bold tabular-nums">{pct(v.rate)}</td>
                  <td className="py-3 text-right text-[11.5px] text-ink-variant">{v.source}, {v.asOf}</td>
                </tr>
              ))}
              <tr className="border-b border-ink-line">
                <td className="py-3 font-semibold">Equity LTCG</td>
                <td className="py-3 font-bold tabular-nums">
                  {pct(INDIA_2026_27.capitalGains.equity.longTermRate)}
                </td>
                <td className="py-3 text-right text-[11.5px] text-ink-variant">
                  above {inr(INDIA_2026_27.capitalGains.equity.annualExemption)} —{' '}
                  {INDIA_2026_27.capitalGains.equity.source}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 rounded-2xl bg-primary-container px-4 py-3.5 text-[12.5px] leading-relaxed text-primary-on">
            Thresholds that never move are a real tax rise every year. Projecting thirty years while
            freezing today&apos;s law is a specific and wrong assumption, so the plan lets you choose
            between frozen and inflation-indexed — and shows what the choice costs.
          </div>
        </section>
      )}
    </>
  );
}

function LogView({ months }: { months: MonthCell[] }) {
  const years = Array.from(new Set(months.map((m) => m.fyYear))).sort((a, b) => b - a);
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const cells = months.filter((m) => m.fyYear === year);

  if (!months.length) {
    return (
      <section className="m3-card-elevated">
        <h2 className="text-base font-bold">Nothing logged yet</h2>
        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-ink-variant">
          Use the Log investment button to record what you actually invested. Until a month is
          confirmed it stays pending rather than counting as zero — a busy fortnight should not make
          the app tell you that you are failing.
        </p>
      </section>
    );
  }

  return (
    <section className="m3-card-elevated">
      <h2 className="text-base font-bold">Every year you have tracked</h2>
      <p className="mb-4 mt-1 text-xs text-ink-variant">Pick a year, then a month.</p>

      <div className={`mb-4 flex gap-2 ${years.length > 9 ? 'overflow-x-auto pb-2' : ''}`}>
        {years.map((y) => {
          const total = months.filter((m) => m.fyYear === y).reduce((a, m) => a + m.actual, 0);
          return (
            <button key={y} onClick={() => setYear(y)} aria-pressed={y === year}
              className={`rounded-2xl border-2 px-3.5 py-2.5 text-left transition ${
                years.length > 9 ? 'w-[120px] flex-none' : 'flex-1 min-w-[108px]'
              } ${y === year ? 'border-primary bg-primary-container' : 'border-transparent bg-surface-2'}`}>
              <span className="block text-[11.5px] font-bold">{fyLabel(y)}</span>
              <span className="mt-1 block text-sm font-extrabold tabular-nums">
                {total ? inr(total) : '—'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12">
        {FY_MONTHS.map((label, i) => {
          const cell = cells.find((c) => c.monthIndex === i);
          const tone = !cell?.confirmed ? 'border border-dashed border-ink-outline bg-surface-2 text-ink-outline'
            : cell.actual > cell.planned ? 'bg-secondary text-white'
            : cell.actual === 0 ? 'bg-danger-container text-danger-on'
            : cell.actual < cell.planned ? 'bg-warn-container text-warn-on'
            : 'bg-secondary-container text-secondary-on';
          return (
            <div key={label} className={`grid aspect-square place-items-center rounded-xl text-[10.5px] font-bold ${tone}`}>
              <span>{label}</span>
              <span className="text-[9px] font-semibold opacity-75">
                {cell?.actual ? inr(cell.actual) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LaterView({ input }: { input: PlanInput }) {
  const plan = buildPlan(input);
  const buckets = [
    ['Cash bucket', '3 yrs', plan.corpusRequired * 0.06, 'bg-secondary',
     'Three years of spending, untouched by markets. Spend from here after a fall so equity is never sold at the bottom.'],
    ['Stability bucket', 'yrs 4–10', plan.corpusRequired * 0.28, 'bg-primary',
     'Debt, EPF, PPF and guaranteed instruments. Refills the cash bucket annually in normal years.'],
    ['Growth bucket', 'yrs 11+', plan.corpusRequired * 0.66, 'bg-tertiary',
     'Equity. Decades to recover from anything, and the only bucket that outruns medical inflation.'],
  ] as const;

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        {buckets.map(([name, window, value, tone, detail]) => (
          <article key={name} className="rounded-[20px] bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-bold">{name}</span>
              <span className="rounded-full bg-surface-3 px-2.5 py-0.5 text-[10.5px] font-bold">{window}</span>
            </div>
            <p className="mb-2 mt-1.5 text-[23px] font-extrabold tabular-nums">{inr(value)}</p>
            <div className="mb-2 h-1.5 overflow-hidden rounded bg-surface-3">
              <div className={`h-full ${tone}`} style={{ width: '100%' }} />
            </div>
            <p className="text-xs leading-relaxed text-ink-variant">{detail}</p>
          </article>
        ))}
      </div>

      <section className="m3-card-elevated">
        <h2 className="text-base font-bold">Withdrawal sequence</h2>
        <p className="mb-4 mt-1 max-w-prose text-xs leading-relaxed text-ink-variant">
          Which pot to draw from each year, and why. Here tax does come out of the corpus, because
          there is no salary left to absorb it.
        </p>
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-line text-[11px] font-bold text-ink-variant">
              <th className="pb-2.5 text-left">Year</th>
              <th className="pb-2.5 text-left">Draw from</th>
              <th className="pb-2.5 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {[
              [String(input.profile.retirementAge), 'Equity harvest',
               `Use the ${inr(INDIA_2026_27.capitalGains.equity.annualExemption)} LTCG exemption — it resets yearly and never carries forward`],
              [String(input.profile.retirementAge), 'Cash bucket', 'Balance of spending, no tax event'],
              [String(input.profile.retirementAge + 1), 'Equity + deposit ladder', 'Exemption again, plus the maturing rung'],
              ['60', 'NPS lump sum', 'The 60% is exempt; the other 40% is forced into an annuity'],
              ['61+', 'Annuity + harvest', 'Annuity is slab-taxed; keep other draws inside the rebate threshold'],
              ['70+', 'Stability bucket', 'Equity tapers; senior interest relief applies'],
            ].map(([year, from, why]) => (
              <tr key={year + from} className="border-b border-ink-line last:border-0">
                <td className="py-3 font-bold">{year}</td>
                <td className="py-3 font-semibold">{from}</td>
                <td className="max-w-[260px] py-3 text-[11.5px] text-ink-variant">{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
