'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { PlanInput } from '@/lib/engine/types';
import type { MonthCell } from '@/lib/loadPlan';
import { buildPlan, solveRetirementAge, solveRequiredMonthly } from '@/lib/engine/projection';
import { corpusImpact } from '@/lib/engine/instruments';
import { Gauge } from './Gauge';
import { LifeChart } from './charts/LifeChart';
import { inr, rupees, pct } from '@/lib/format';

/**
 * The home screen.
 *
 * The needle is driven by what was actually LOGGED, not what was planned. That is
 * the whole point — a plan you don't track is a wish.
 */
export function MeterView({ input, months }: { input: PlanInput; months: MonthCell[] }) {
  const plan = useMemo(() => buildPlan(input), [input]);

  const confirmed = months.filter((m) => m.confirmed);
  const pace = confirmed.length
    ? confirmed.reduce((a, m) => a + m.actual, 0) / confirmed.length
    : input.profile.monthlySavings;

  const projectedAge = useMemo(
    () => solveRetirementAge(input, pace) ?? 72,
    [input, pace]
  );

  const required = solveRequiredMonthly(input);

  // Cumulative drift: what the gap between plan and actual has cost so far,
  // expressed at retirement. A number in rupees changes behaviour; a percentage doesn't.
  const shortfall = confirmed.reduce((a, m) => a + Math.max(0, m.planned - m.actual), 0)
                  - confirmed.reduce((a, m) => a + Math.max(0, m.actual - m.planned), 0);
  const driftCost = corpusImpact(
    shortfall, plan.blendedReturn, input.profile.retirementAge - input.profile.currentAge - 0.5
  );

  const dayGain = (input.holdings.reduce((a, h) => a + h.value, 0) * plan.blendedReturn) / 365;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[22px] font-bold md:text-[28px]">Where you stand</h1>
          <p className="mt-1 text-sm text-ink-variant">
            Driven by what you actually logged, not what you planned.
          </p>
        </div>
        <form action="/api/kite/login">
          <button className="m3-btn-tonal">↻ Sync Zerodha</button>
        </form>
      </header>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.05, 0.7, 0.1, 1] }}
          className="relative overflow-hidden rounded-xl3 p-6 text-white"
          style={{ background: 'linear-gradient(150deg,#4B21C4,#6C3BF5 44%,#A346F0 76%,#FF3D8A 138%)' }}
        >
          <span aria-hidden className="absolute -right-28 -top-36 h-80 w-80 rounded-full bg-white/10" />
          <p className="relative text-[12.5px] font-semibold opacity-80">Projected retirement age</p>
          <Gauge projectedAge={projectedAge} targetAge={input.profile.retirementAge} />
          <dl className="relative mt-5 flex flex-wrap gap-6 border-t border-white/20 pt-4">
            <Stat label="Required monthly" value={required === null ? 'not possible' : rupees(required)} />
            <Stat label="Your pace" value={rupees(pace)} />
            <Stat label="Blended return" value={pct(plan.blendedReturn)} />
          </dl>
        </motion.section>

        <section className="m3-card-elevated">
          <h2 className="text-base font-bold">Where the gap stands</h2>
          <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-variant">
            Corpus you are on track for, against what lasting to {input.profile.terminalAge} demands.
          </p>
          <Row label={`Corpus at ${input.profile.retirementAge}`}
               value={plan.corpusAtRetirement < 0 ? 'runs dry' : inr(plan.corpusAtRetirement)} />
          <Row label="Needed" value={inr(plan.corpusRequired)} />
          <Row label={plan.gap > 0 ? 'Short by' : 'Surplus'} value={inr(Math.abs(plan.gap))}
               tone={plan.gap > 0 ? 'bad' : 'ok'} />
          <Row label="Implied withdrawal rate" value={pct(plan.safeWithdrawalRate)} />

          <div className="mt-4 rounded-2xl bg-primary-container px-4 py-3.5 text-[12.5px] leading-relaxed text-primary-on">
            The 4% rule would let you draw {inr(plan.corpusRequired * 0.04)} in year one.
            At the {pct(plan.safeWithdrawalRate)} this plan actually supports, it is{' '}
            {inr(plan.corpusRequired * plan.safeWithdrawalRate)} — the difference between the
            American assumption and Indian inflation.
          </div>
        </section>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Net worth" value={inr(input.holdings.reduce((a, h) => a + h.value, 0))}
             detail={`+${rupees(dayGain)} today`} tone="ok" />
        <Kpi label="Months funded"
             value={`${confirmed.filter((m) => m.actual >= m.planned).length} of ${confirmed.length || '—'}`}
             detail={`${confirmed.filter((m) => m.actual === 0).length} missed`} tone="warn" />
        <Kpi label={`Drift cost at ${input.profile.retirementAge}`} value={inr(Math.abs(driftCost))}
             detail={driftCost > 0 ? 'cost so far' : 'ahead of plan'} tone={driftCost > 0 ? 'bad' : 'ok'} />
        <Kpi label="Years compounding" value={`${input.profile.retirementAge - input.profile.currentAge} yrs`}
             detail={`then ${input.profile.terminalAge - input.profile.retirementAge} drawing down`} />
      </div>

      <section className="m3-card-elevated">
        <h2 className="text-base font-bold">Your money across your life</h2>
        <p className="mb-4 mt-1 text-xs text-ink-variant">
          Each dip is a milestone paid for. The fall after retirement is the corpus doing its job.
        </p>
        <LifeChart rows={plan.rows} required={plan.corpusRequired} input={input} />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-0.5 text-[10.5px] font-semibold opacity-75">{label}</dt>
      <dd className="text-[17px] font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-line py-3 last:border-0">
      <span className="text-sm font-medium text-ink-variant">{label}</span>
      <span className={`text-[15px] font-bold tabular-nums ${
        tone === 'bad' ? 'text-danger' : tone === 'ok' ? 'text-secondary' : ''
      }`}>{value}</span>
    </div>
  );
}

function Kpi({ label, value, detail, tone }: {
  label: string; value: string; detail?: string; tone?: 'ok' | 'bad' | 'warn';
}) {
  const toneClass = tone === 'ok' ? 'text-secondary'
    : tone === 'bad' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ink-variant';
  return (
    <div className="rounded-[20px] bg-surface-1 p-4 transition hover:bg-surface-2">
      <p className="mb-2 text-[11.5px] font-semibold text-ink-variant">{label}</p>
      <p className="text-[25px] font-extrabold tracking-[-.035em] tabular-nums">{value}</p>
      {detail && <p className={`mt-1 text-[11.5px] font-semibold ${toneClass}`}>{detail}</p>}
    </div>
  );
}
