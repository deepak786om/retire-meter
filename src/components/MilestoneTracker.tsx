'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { PlanInput } from '@/lib/engine/types';
import { computeGoalProgress, completeGoal, type GoalProgress } from '@/lib/engine/goals';
import { buildPlan } from '@/lib/engine/projection';
import { GOAL_META } from '@/lib/engine/defaults';
import { inr, rupees } from '@/lib/format';

/**
 * Milestone tracker.
 *
 * The number that matters here is MONTHS BEHIND, not percent funded. "62% funded"
 * is meaningless without knowing how long is left; "four months behind, ₹4,800 to
 * catch up" is something you can act on this week.
 */
export function MilestoneTracker({
  input,
  balances,
  monthsElapsed,
}: {
  input: PlanInput;
  balances: Record<string, number>;
  monthsElapsed: number;
}) {
  const plan = useMemo(() => buildPlan(input), [input]);
  const { goals, leftoverForRetirement } = useMemo(
    () => computeGoalProgress(input, balances, monthsElapsed),
    [input, balances, monthsElapsed]
  );
  const [completing, setCompleting] = useState<GoalProgress | null>(null);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {goals.map((g) => (
          <MilestoneCard key={g.goal.id} progress={g} onComplete={() => setCompleting(g)} />
        ))}
      </div>

      <section className="mt-3 rounded-[20px] bg-surface-1 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-container text-lg">🌅</span>
          <span className="flex-1">
            <span className="block text-sm font-bold">Retirement</span>
            <span className="block text-[11.5px] text-ink-variant">
              Everything left after the milestones above are covered
            </span>
          </span>
          <span className="text-right">
            <span className="block text-[17px] font-extrabold tabular-nums">{inr(leftoverForRetirement)}</span>
            <span className="block text-[11px] text-ink-outline">of {inr(plan.corpusRequired)} needed</span>
          </span>
        </div>
      </section>

      {completing && (
        <CompletionDialog
          progress={completing}
          blendedReturn={plan.blendedReturn}
          yearsToRetirement={input.profile.retirementAge - input.profile.currentAge}
          onClose={() => setCompleting(null)}
        />
      )}
    </>
  );
}

const STATUS: Record<GoalProgress['status'], { label: string; bar: string; chip: string }> = {
  on_track:  { label: 'On track',  bar: 'bg-secondary', chip: 'bg-secondary-container text-secondary-on' },
  behind:    { label: 'Behind',    bar: 'bg-warn',      chip: 'bg-warn-container text-warn-on' },
  at_risk:   { label: 'At risk',   bar: 'bg-danger',    chip: 'bg-danger-container text-danger-on' },
  funded:    { label: 'Funded',    bar: 'bg-secondary', chip: 'bg-secondary-container text-secondary-on' },
  completed: { label: 'Completed', bar: 'bg-ink-outline', chip: 'bg-surface-3 text-ink-variant' },
};

function MilestoneCard({ progress: g, onComplete }: {
  progress: GoalProgress; onComplete: () => void;
}) {
  const meta = GOAL_META[g.goal.kind];
  const s = STATUS[g.status];
  const due = g.yearsAway <= 0;

  return (
    <motion.article layout className="m3-card-elevated">
      <header className="mb-3 flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary-container text-lg">
          {meta.emoji}
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-bold">{g.goal.name}</span>
          <span className="block text-[11.5px] text-ink-variant">
            age {g.goal.targetAge} · {g.yearsAway} yr{g.yearsAway === 1 ? '' : 's'} away
            {g.goal.priority !== undefined && ` · priority ${g.goal.priority <= 20 ? 'high' : g.goal.priority <= 50 ? 'medium' : 'low'}`}
          </span>
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${s.chip}`}>{s.label}</span>
      </header>

      <div className="mb-2 h-2 overflow-hidden rounded bg-surface-3">
        <motion.div className={`h-full rounded ${s.bar}`}
          initial={{ width: 0 }} animate={{ width: `${g.percentFunded}%` }}
          transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }} />
      </div>

      <p className="flex justify-between text-xs text-ink-variant">
        <span><b className="text-ink">{inr(g.accumulated)}</b> of {inr(g.targetAmount)}</span>
        <span className="font-bold">{g.percentFunded}%</span>
      </p>

      {/* The headline number: months, not percent. */}
      <div className="mt-3 border-t border-ink-line pt-3">
        {g.monthsBehind > 1 ? (
          <p className="text-[13px] font-semibold text-danger">
            {Math.round(g.monthsBehind)} month{Math.round(g.monthsBehind) === 1 ? '' : 's'} behind
            <span className="ml-1 font-normal text-ink-variant">
              — {rupees(g.catchUpAmount)} to catch up, or {rupees(g.requiredMonthly + g.catchUpAmount / 12)} a month for a year
            </span>
          </p>
        ) : (
          <p className="text-[13px] font-semibold text-secondary">
            On schedule
            <span className="ml-1 font-normal text-ink-variant">
              — {rupees(g.requiredMonthly)} a month keeps it there
            </span>
          </p>
        )}
      </div>

      {g.fundedBy.length > 0 && (
        <div className="mt-3 border-t border-ink-line pt-3">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-ink-outline">
            Funded by
          </p>
          <div className="flex flex-wrap gap-1.5">
            {g.fundedBy.map((f) => (
              <span key={f.key}
                    className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold">
                {f.label} · {inr(f.value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {g.glide && (
        <p className="mt-3 rounded-2xl bg-warn-container px-3.5 py-3 text-[12px] leading-relaxed text-warn-on">
          <b>Time to de-risk.</b> {g.glide.message}
        </p>
      )}

      {g.exposureWarning && (
        <p className="mt-3 rounded-2xl bg-danger-container px-3.5 py-3 text-[12px] leading-relaxed text-danger-on">
          <b>Exposed.</b> {g.exposureWarning}
        </p>
      )}

      {due && g.status !== 'completed' && (
        <button onClick={onComplete} className="m3-btn-filled mt-3 w-full">
          Mark as bought
        </button>
      )}
    </motion.article>
  );
}

/**
 * Completion.
 *
 * The plan figure is a pre-fill, never an assumption. Variance at completion tells
 * you whether your estimates are systematically optimistic — which matters far more
 * for the goals still ahead than for the one just paid for.
 */
function CompletionDialog({ progress, blendedReturn, yearsToRetirement, onClose }: {
  progress: GoalProgress; blendedReturn: number; yearsToRetirement: number; onClose: () => void;
}) {
  const [spent, setSpent] = useState(Math.round(progress.targetAmount));
  const outcome = completeGoal(progress, spent, blendedReturn, yearsToRetirement);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal>
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-[520px] rounded-xl3 bg-surface-1 p-6 shadow-e5">
        <h2 className="text-xl font-bold">{progress.goal.name}</h2>
        <p className="mb-5 mt-1.5 text-[13px] text-ink-variant">
          What did it actually cost? We have pre-filled the planned figure — change it if it
          was different, because that gap is the most useful thing you can tell the plan.
        </p>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[11px] font-semibold text-ink-variant">
            Actually spent (planned: {rupees(progress.targetAmount)})
          </span>
          <span className="flex items-center rounded-xl border border-ink-outline bg-surface focus-within:border-primary">
            <span className="pl-3.5 font-bold text-ink-variant">₹</span>
            <input inputMode="numeric" value={spent.toLocaleString('en-IN')}
                   onChange={(e) => setSpent(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                   onFocus={(e) => e.target.select()}
                   className="w-full bg-transparent px-3.5 py-3 text-[15px] font-semibold tabular-nums outline-none" />
          </span>
        </label>

        <p className={`rounded-2xl px-4 py-3.5 text-[12.5px] leading-relaxed ${
          Math.abs(outcome.variance) < progress.targetAmount * 0.01
            ? 'bg-secondary-container text-secondary-on'
            : outcome.variance > 0
              ? 'bg-danger-container text-danger-on'
              : 'bg-secondary-container text-secondary-on'}`}>
          {outcome.message}
        </p>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="m3-btn-filled flex-1">Record it</button>
          <button onClick={onClose} className="m3-btn-text">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}
