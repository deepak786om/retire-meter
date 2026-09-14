'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlanInput } from '@/lib/engine/types';
import { blendedReturn } from '@/lib/engine/instruments';
import { solveRequiredMonthly } from '@/lib/engine/projection';
import { suggestAllocation, allocationWarnings, tagFor } from '@/lib/engine/allocation';
import { inr } from '@/lib/format';

/**
 * Rates AND amounts are both the user's to set.
 *
 * The total is fixed by the arithmetic; the split is a risk judgement only they can
 * make. But the split feeds back into the total — moving money from FD into equity
 * lifts the blended return, which lowers the required monthly. That loop is the
 * point, and it has to be narrated, because otherwise it becomes an incentive to
 * dial equity up until the number looks nice.
 */
export function AllocationTable({
  input,
  onChange,
}: {
  input: PlanInput;
  onChange: (next: PlanInput) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);

  const rates = useMemo(
    () => Object.fromEntries(Object.entries(input.instruments).map(([k, i]) => [k, i.rate])),
    [input.instruments]
  );

  const suggestedRequired = useMemo(
    () => solveRequiredMonthly({ ...input, allocation: suggestBase(input) }) ?? 0,
    [input]
  );
  const suggested = useMemo(
    () => suggestAllocation(input, suggestedRequired),
    [input, suggestedRequired]
  );

  const required = solveRequiredMonthly(input);
  const allocated = Object.values(input.allocation).reduce((a, b) => a + b, 0);
  const unallocated = required === null ? 0 : Math.round(required - allocated);
  const reconciled = Math.abs(unallocated) <= 1;
  const blend = blendedReturn(input.allocation, rates);
  const warnings = allocationWarnings(input, input.allocation);

  const keys = Array.from(new Set([...Object.keys(suggested), ...Object.keys(input.allocation)]))
    .sort((a, b) => (input.allocation[b] ?? 0) - (input.allocation[a] ?? 0));

  function setAmount(key: string, raw: string) {
    const value = Math.max(0, Math.round(Number(raw.replace(/[^0-9.]/g, '')) || 0));
    const before = { blend, required };
    const nextAllocation = { ...input.allocation, [key]: value };
    const next = { ...input, allocation: nextAllocation };

    const afterBlend = blendedReturn(nextAllocation, rates);
    const afterRequired = solveRequiredMonthly(next);
    onChange(next);

    const dBlend = afterBlend - before.blend;
    const dReq = (before.required ?? 0) - (afterRequired ?? 0);

    if (Math.abs(dBlend) > 0.00005) {
      // Both halves, always. A lower monthly figure bought with volatility is a
      // trade, not a win, and the app must not let that pass silently.
      setMessage(
        `${input.instruments[key].label} set to ${inr(value)}. Blend ${(before.blend * 100).toFixed(2)}% → ${(afterBlend * 100).toFixed(2)}%, so the plan needs ${inr(Math.abs(dReq))} ${dReq > 0 ? 'less' : 'more'} a month. ` +
        (dBlend > 0
          ? 'That saving is bought with volatility — a bad first two years in retirement now costs you more.'
          : 'Safer, but you pay for it every month.')
      );
    } else {
      setMessage(`${input.instruments[key].label} set to ${inr(value)}.`);
    }
  }

  function setRate(key: string, raw: string) {
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(parsed)) return;
    const rate = Math.max(0, Math.min(30, parsed)) / 100;
    const inst = input.instruments[key];
    onChange({ ...input, instruments: { ...input.instruments, [key]: { ...inst, rate } } });

    // Sanity band, not a hard cap. The user keeps control; the app stays honest.
    const suspicious = inst.archetype === 'growth' && rate > 0.14;
    setMessage(
      suspicious
        ? `Set to ${(rate * 100).toFixed(2)}% — well above the 20-year Nifty TRI of 12.44%. Plan re-solved, but treat the result with suspicion.`
        : `${inst.label} set to ${(rate * 100).toFixed(2)}%.`
    );
  }

  return (
    <section className="rounded-xl2 bg-surface p-5 shadow-e1">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold">Your monthly investment plan</h3>
          <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-variant">
            Rates and amounts are both yours to set. The total is fixed by the maths;
            how you split it is your risk call.
          </p>
        </div>
        <button
          onClick={() => { onChange({ ...input, allocation: suggested }); setMessage('Back to the horizon-based split.'); }}
          className="rounded-full px-4 py-2 text-[13px] font-semibold text-primary transition hover:bg-primary-container"
        >
          ↺ Restore suggested
        </button>
      </header>

      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="border-b border-ink-line text-[11px] font-bold text-ink-variant">
            <th className="pb-2.5 text-left">Instrument</th>
            <th className="pb-2.5 text-left">Rate</th>
            <th className="pb-2.5 text-left">Why here</th>
            <th className="pb-2.5 text-right">Monthly</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const inst = input.instruments[key];
            if (!inst) return null;
            const mine = input.allocation[key] ?? 0;
            const sug = suggested[key] ?? 0;
            const moved = Math.abs(mine - sug) > 100;
            const contractual = inst.rateKind === 'contractual';

            return (
              <tr key={key} className="border-b border-ink-line last:border-0">
                <td className="py-3">
                  <div className="font-semibold">{inst.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-ink-variant">{inst.source}</div>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      defaultValue={(inst.rate * 100).toFixed(2).replace(/\.00$/, '')}
                      onBlur={(e) => setRate(key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      inputMode="decimal"
                      aria-label={`${inst.label} rate`}
                      className="w-[62px] rounded-lg border border-ink-line bg-surface-1 px-2 py-1.5 text-right text-[13px] font-bold tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs">%</span>
                  </div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                    contractual ? 'bg-secondary-container text-secondary-on' : 'bg-warn-container text-warn-on'
                  }`}>
                    {contractual ? 'CONTRACTUAL' : 'ASSUMED'}
                  </span>
                </td>
                <td className="max-w-[180px] py-3 text-[11.5px] text-ink-variant">{tagFor(inst)}</td>
                <td className="py-3 text-right">
                  <input
                    defaultValue={mine.toLocaleString('en-IN')}
                    onBlur={(e) => setAmount(key, e.target.value)}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    aria-label={`${inst.label} monthly amount`}
                    className={`w-[108px] rounded-lg border px-2.5 py-1.5 text-right text-sm font-extrabold tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      moved ? 'border-primary bg-primary-container' : 'border-ink-line bg-surface-1'
                    }`}
                  />
                  <div className="mt-1 text-[11.5px] text-ink-variant">
                    {moved ? `suggested ${inr(sug)}` : 'as suggested'}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr>
            <td className="py-3 font-extrabold">Plan needs</td>
            <td /><td />
            <td className="py-3 text-right text-base font-extrabold tabular-nums text-primary">
              {required === null ? 'no solution' : inr(required)}
            </td>
          </tr>
        </tbody>
      </table>

      <motion.div
        layout
        className={`mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-4 text-[13.5px] font-semibold ${
          reconciled ? 'bg-secondary-container text-secondary-on' : 'bg-danger-container text-danger-on'
        }`}
      >
        <span>{reconciled ? '✓ Fully allocated' : unallocated > 0 ? 'Still to allocate' : 'Over-allocated'}</span>
        <span className="text-lg font-extrabold tabular-nums">
          {inr(allocated)} of {required === null ? '—' : inr(required)}
          {!reconciled && ` · ${inr(Math.abs(unallocated))} ${unallocated > 0 ? 'left' : 'over'}`}
        </span>
      </motion.div>

      {!reconciled && (
        <p className="mt-2.5 text-[12.5px] font-semibold text-danger">
          Put the remaining {inr(Math.abs(unallocated))} somewhere before you continue.
        </p>
      )}

      <div className="mt-3.5 rounded-2xl bg-primary-container px-4 py-3.5 text-[12.5px] leading-relaxed text-primary-on">
        This mix returns a blended <b>{(blend * 100).toFixed(2)}%</b> a year before retirement.
        That single number drives the whole projection. Contractual rates are facts you can look
        up; assumed rates are judgements you can argue with. Nothing is taxed out of the corpus
        here — deposit interest is added to your income and settled from salary.
      </div>

      <AnimatePresence>
        {warnings.map((w) => (
          <motion.div
            key={w.title}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2.5 overflow-hidden rounded-2xl bg-warn-container px-4 py-3.5 text-[12.5px] leading-relaxed text-warn-on"
          >
            <b>{w.title}.</b> {w.detail}
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        disabled={!reconciled}
        className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-e1 transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-ink-outline disabled:shadow-none"
      >
        Continue with this plan
      </button>

      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            onAnimationComplete={() => setTimeout(() => setMessage(null), 5000)}
            role="status"
            className="fixed bottom-8 left-1/2 z-[120] w-[min(560px,92vw)] -translate-x-1/2 rounded-2xl bg-[#2C2833] px-5 py-4 text-[13.5px] text-[#F3EFF7] shadow-e3"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Seed allocation used only to get a starting required-monthly figure. */
function suggestBase(input: PlanInput): Record<string, number> {
  const out: Record<string, number> = {};
  for (const inst of Object.values(input.instruments)) out[inst.key] = 1;
  return out;
}
