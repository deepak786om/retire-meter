'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Goal, PlanInput } from '@/lib/engine/types';
import { DEFAULT_INPUT, GOAL_META } from '@/lib/engine/defaults';
import { buildPlan, solveRetirementAge, solveMaxExpense, goalCostAtTarget } from '@/lib/engine/projection';
import { suggestAllocation } from '@/lib/engine/allocation';
import { sipForTarget } from '@/lib/engine/instruments';
import { AllocationTable } from './AllocationTable';
import { LifeChart } from './charts/LifeChart';
import { inr, rupees, pct } from '@/lib/format';

const STEPS = ['You', 'Money', 'Milestones', 'Lifestyle', 'Assets'] as const;
const YEAR = new Date().getFullYear();

/**
 * The free planner. No account, nothing stored, nothing transmitted — the engine
 * runs entirely in the browser, which is also why the privacy claim on the landing
 * page is literally true rather than a promise.
 */
export function Wizard() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [input, setInput] = useState<PlanInput>(DEFAULT_INPUT);

  const plan = useMemo(() => buildPlan(input), [input]);

  const setProfile = (patch: Partial<PlanInput['profile']>) =>
    setInput((i) => ({ ...i, profile: { ...i.profile, ...patch } }));

  function finish() {
    // Seed the allocation from the horizon mix so the result page opens reconciled.
    const seeded = { ...input };
    const required = buildPlan(seeded).requiredMonthly ?? 0;
    setInput({ ...seeded, allocation: suggestAllocation(seeded, required) });
    setDone(true);
    window.scrollTo({ top: 0 });
  }

  if (done) return <Result input={input} onEdit={() => setDone(false)} onChange={setInput} />;

  return (
    <div className="mx-auto max-w-[760px] px-6 py-8">
      <div className="mb-5 flex items-center justify-between">
        <a href="/" className="m3-btn-text -ml-4">← Home</a>
        <button onClick={() => { setInput(DEFAULT_INPUT); setStep(0); }}
                className="m3-btn-text !text-danger">↺ Start over</button>
      </div>

      <Stepper step={step} onJump={setStep} />

      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.28, ease: [0.05, 0.7, 0.1, 1] }}>

          {step === 0 && (
            <Step title="How long must this plan last?"
                  lede="Two ages decide everything else — when the salary stops, and when the money must stop lasting.">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Your age today" suffix="yrs" value={input.profile.currentAge}
                       onChange={(v) => setProfile({ currentAge: v })} />
                <Field label="Retire at" suffix="yrs" value={input.profile.retirementAge}
                       onChange={(v) => setProfile({ retirementAge: v })} />
              </div>
              <Field label="Plan until age" suffix="yrs" value={input.profile.terminalAge}
                     onChange={(v) => setProfile({ terminalAge: v })}
                     error={input.profile.terminalAge <= input.profile.retirementAge
                       ? `Must be greater than your retirement age of ${input.profile.retirementAge}.` : undefined}
                     help={`${input.profile.terminalAge - input.profile.retirementAge} years of drawing down. Indian life tables give a healthy 32-year-old roughly a one-in-four chance of reaching 90 — planning to 85 is the commonest way these plans quietly fail.`} />
            </Step>
          )}

          {step === 1 && (
            <Step title="What comes in, what goes out"
                  lede="Your savings rate moves the outcome more than any investment choice for the next fifteen years.">
              <Field label="Monthly take-home" prefix="₹" value={input.profile.monthlyIncome}
                     onChange={(v) => setProfile({ monthlyIncome: v })} help="In hand, not CTC." />
              <Field label="Monthly household expenses" prefix="₹" value={input.profile.monthlyExpense}
                     onChange={(v) => setProfile({ monthlyExpense: v })}
                     help="Rent, food, bills, fees. Travel comes later." />
              <Field label="Monthly savings & SIPs" prefix="₹" value={input.profile.monthlySavings}
                     onChange={(v) => setProfile({ monthlySavings: v })} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Salary growth" suffix="%/yr" value={Math.round(input.profile.salaryGrowth * 100)}
                       onChange={(v) => setProfile({ salaryGrowth: v / 100 })} />
                <Field label="Lifestyle inflation" suffix="%/yr" value={Math.round(input.profile.lifestyleInflation * 100)}
                       onChange={(v) => setProfile({ lifestyleInflation: v / 100 })} />
              </div>
              <Note>If spending grows as fast as income you never get closer to retiring. The gap
                between these two numbers is the whole game.</Note>
            </Step>
          )}

          {step === 2 && (
            <Step title="Your milestones"
                  lede="Everything you intend to buy or do, and when. These compete for the same money — the part most calculators ignore.">
              <GoalEditor input={input} setInput={setInput} />
            </Step>
          )}

          {step === 3 && (
            <Step title="Travel, lifestyle, health"
                  lede="Recurring, not one-off. Travel inflates near 7.5% and medical near 13% — roughly triple general inflation.">
              <Field label="Travel a year, now" prefix="₹" value={input.profile.travelPerYearNow}
                     onChange={(v) => setProfile({ travelPerYearNow: v })} />
              <Field label="Travel a year, once retired" prefix="₹" value={input.profile.travelPerYearRetired}
                     onChange={(v) => setProfile({ travelPerYearRetired: v })}
                     help="Today's money. Tapered automatically — heavy in your sixties, light in your late seventies." />
              <Field label="Out-of-pocket medical a year, now" prefix="₹" value={input.profile.medicalPerYearNow}
                     onChange={(v) => setProfile({ medicalPerYearNow: v })}
                     help="This is what breaks late retirement. Employer cover ends the day you stop working." />
            </Step>
          )}

          {step === 4 && (
            <Step title="What you already have"
                  lede="All of it counts. Leave anything you don't hold at zero.">
              <div className="grid gap-3.5 sm:grid-cols-2">
                {Object.values(input.instruments).map((inst) => (
                  <Field key={inst.key} label={inst.label} prefix="₹"
                         value={input.holdings.find((h) => h.key === inst.key)?.value ?? 0}
                         onChange={(v) => setInput((i) => ({
                           ...i,
                           holdings: [
                             ...i.holdings.filter((h) => h.key !== inst.key),
                             { key: inst.key, value: v },
                           ],
                         }))} />
                ))}
              </div>
            </Step>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex flex-wrap gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
                  className="rounded-full border border-ink-line px-5 py-3 text-sm font-semibold text-primary">
            Back
          </button>
        )}
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} className="m3-btn-filled"
                  disabled={step === 0 && input.profile.terminalAge <= input.profile.retirementAge}>
            Continue
          </button>
        ) : (
          <button onClick={finish} className="m3-btn-filled">See my plan →</button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── result ─────────────────────────── */

function Result({ input, onEdit, onChange }: {
  input: PlanInput; onEdit: () => void; onChange: (i: PlanInput) => void;
}) {
  const plan = useMemo(() => buildPlan(input), [input]);
  const { profile: p } = input;
  const ahead = plan.gap <= 0;
  const laterAge = solveRetirementAge(input, p.monthlySavings);
  const lowerExpense = solveMaxExpense(input);

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-8">
      <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl3 p-7 text-white"
          style={{ background: 'linear-gradient(150deg,#4B21C4,#6C3BF5 44%,#A346F0 76%,#FF3D8A 138%)' }}>
          <span aria-hidden className="absolute -right-28 -top-36 h-80 w-80 rounded-full bg-white/10" />
          <p className="relative text-[12.5px] font-semibold opacity-80">
            {ahead ? 'You are ahead' : `Shortfall at ${p.retirementAge}`}
          </p>
          <p className="relative mt-2.5 text-[46px] font-extrabold leading-none tracking-[-.04em] tabular-nums">
            {ahead ? '+' : '−'}{inr(Math.abs(plan.gap))}
          </p>
          <p className="relative mt-2.5 max-w-[42ch] text-[13.5px] opacity-90">
            At {rupees(p.monthlySavings)} a month you reach{' '}
            {plan.corpusAtRetirement < 0
              ? `zero — the plan runs dry before ${p.retirementAge}`
              : inr(plan.corpusAtRetirement)} by {p.retirementAge}.
            Lasting to {p.terminalAge} needs {inr(plan.corpusRequired)}.
          </p>
          <dl className="relative mt-5 flex flex-wrap gap-6 border-t border-white/20 pt-4">
            <Stat label="Needed monthly"
                  value={plan.requiredMonthly === null ? 'not possible' : rupees(plan.requiredMonthly)} />
            <Stat label="You save" value={rupees(p.monthlySavings)} />
            <Stat label="Withdrawal rate" value={pct(plan.safeWithdrawalRate)} />
          </dl>
        </motion.section>

        <section className="m3-card-elevated">
          <h2 className="text-base font-bold">What closes the gap</h2>
          <p className="mb-4 mt-1 text-xs text-ink-variant">Any one of these on its own.</p>
          {ahead ? (
            <p className="rounded-2xl bg-secondary-container px-4 py-3.5 text-[12.5px] text-secondary-on">
              You have room. You could retire earlier than {p.retirementAge}, or spend more.
            </p>
          ) : !plan.feasible ? (
            <div className="rounded-2xl bg-danger-container px-4 py-3.5 text-[12.5px] leading-relaxed text-danger-on">
              <b>No solution at age {p.retirementAge}.</b> Closing this gap needs more than your entire
              take-home. The earliest reachable retirement, saving everything you can, is{' '}
              <b>{laterAge ?? 'not before 75'}</b>. When no monthly figure works, the honest answer is
              not a bigger number — it is a different plan.
            </div>
          ) : (
            <>
              <Lever icon="↑" label="Save more each month" value={rupees(plan.requiredMonthly!)} />
              <Lever icon="⏱" label="Or retire at" value={String(laterAge ?? 'not before 75')} />
              <Lever icon="↓" label="Or cut monthly spending to"
                     value={lowerExpense ? rupees(lowerExpense) : 'not achievable by spending alone'} />
            </>
          )}
        </section>
      </div>

      <div className="mb-4">
        <AllocationTable input={input} onChange={onChange} />
      </div>

      <section className="m3-card-elevated mb-4">
        <h2 className="text-base font-bold">Your money across your life</h2>
        <p className="mb-4 mt-1 text-xs text-ink-variant">
          Each dip is a milestone paid for. The fall after retirement is the corpus doing its job.
        </p>
        <LifeChart rows={plan.rows} required={plan.corpusRequired} input={input} />
      </section>

      <section className="m3-card-elevated mb-4">
        <h2 className="text-base font-bold">Milestone by milestone</h2>
        <p className="mb-4 mt-1 text-xs text-ink-variant">
          What each costs in the year you want it, and what it demands monthly from today.
        </p>
        {input.goals.map((g) => {
          const years = g.targetAge - p.currentAge;
          const then = goalCostAtTarget(g, p.currentAge);
          const rate = years < 3 ? input.instruments.fd.rate : years < 7 ? 0.085 : input.instruments.eq.rate;
          return (
            <div key={g.id} className="flex items-center gap-3 border-b border-ink-line py-3 last:border-0">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary-container text-lg">
                {GOAL_META[g.kind].emoji}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{g.name}</span>
                <span className="block text-[11.5px] text-ink-variant">
                  {YEAR + years} · {inr(then)} by then
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[15px] font-bold tabular-nums">
                  {rupees(sipForTarget(then, years, rate))}
                </span>
                <span className="block text-[11px] text-ink-outline">a month</span>
              </span>
            </div>
          );
        })}
      </section>

      <div className="rounded-xl3 p-8 text-center text-white"
           style={{ background: 'linear-gradient(140deg,#6C3BF5,#FF3D8A)' }}>
        <h2 className="text-2xl font-bold">A plan is worthless unless you track it</h2>
        <p className="mx-auto mt-2 max-w-[48ch] text-[14.5px] opacity-90">
          Log what you actually invest each month. The needle moves with real contributions,
          not intentions.
        </p>
        <a href="/login?mode=signup"
           className="mt-5 inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-primary-dark">
          Create a free account & start tracking
        </a>
      </div>

      <div className="mt-5 text-center">
        <button onClick={onEdit} className="m3-btn-text">← Edit inputs</button>
      </div>
      <p className="mx-auto mt-4 max-w-[64ch] text-center text-[11.5px] leading-relaxed text-ink-outline">
        This is a calculator. It does arithmetic on numbers you enter using assumptions you can
        change. It is not investment advice, recommends no product or fund, and stores nothing.
        For advice on your own situation, speak to a SEBI-registered investment adviser.
      </p>
    </div>
  );
}

/* ─────────────────────────── pieces ─────────────────────────── */

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <ol className="mb-7 flex items-center">
      {STEPS.map((label, i) => (
        <li key={label} className="flex flex-none items-center">
          <button disabled={i > step} onClick={() => onJump(i)}
            className={`grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-bold transition ${
              i === step ? 'scale-110 bg-primary text-white'
              : i < step ? 'bg-secondary text-white' : 'bg-surface-2 text-ink-variant'}`}>
            {i < step ? '✓' : i + 1}
          </button>
          <span className={`ml-2.5 hidden text-[12.5px] font-semibold sm:inline ${
            i === step ? 'text-primary' : 'text-ink-variant'}`}>{label}</span>
          {i < STEPS.length - 1 && (
            <span className="mx-2.5 h-0.5 w-6 overflow-hidden rounded bg-ink-line sm:w-10">
              <span className={`block h-full origin-left bg-secondary transition-transform duration-500 ${
                i < step ? 'scale-x-100' : 'scale-x-0'}`} />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Step({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-[26px] font-bold tracking-[-.03em] md:text-[28px]">{title}</h1>
      <p className="mb-6 mt-2 text-ink-variant">{lede}</p>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, prefix, suffix, help, error }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; help?: string; error?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[11px] font-semibold text-ink-variant">{label}</span>
      <span className={`flex items-center rounded-xl border bg-surface transition focus-within:border-primary ${
        error ? 'border-danger' : 'border-ink-outline'}`}>
        {prefix && <span className="pl-3.5 font-bold text-ink-variant">{prefix}</span>}
        <input
          inputMode="numeric"
          value={value.toLocaleString('en-IN')}
          onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
          onFocus={(e) => e.target.select()}
          className="w-full bg-transparent px-3.5 py-3 text-[15px] font-semibold tabular-nums outline-none"
        />
        {suffix && <span className="pr-3.5 text-xs font-semibold text-ink-variant">{suffix}</span>}
      </span>
      {(error || help) && (
        <span className={`mt-1.5 block pl-1 text-[11.5px] leading-relaxed ${
          error ? 'text-danger' : 'text-ink-variant'}`}>{error ?? help}</span>
      )}
    </label>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-2xl bg-primary-container px-4 py-3.5 text-[12.5px] leading-relaxed text-primary-on">
    {children}
  </p>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="mb-0.5 text-[10.5px] font-semibold opacity-75">{label}</dt>
    <dd className="text-[17px] font-bold tabular-nums">{value}</dd>
  </div>
);

const Lever = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex items-center gap-3 border-b border-ink-line py-3 last:border-0">
    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-primary-container text-primary-on">
      {icon}
    </span>
    <span className="flex-1 text-sm font-semibold">{label}</span>
    <span className="text-[15px] font-bold tabular-nums">{value}</span>
  </div>
);

function GoalEditor({ input, setInput }: { input: PlanInput; setInput: (i: PlanInput) => void }) {
  const [editing, setEditing] = useState<Goal | null>(null);
  const p = input.profile;

  const save = (goal: Goal) => {
    const goals = input.goals.some((g) => g.id === goal.id)
      ? input.goals.map((g) => (g.id === goal.id ? goal : g))
      : [...input.goals, goal];
    goals.sort((a, b) => a.targetAge - b.targetAge);
    setInput({ ...input, goals });
    setEditing(null);
  };

  return (
    <>
      {input.goals.map((g) => (
        <div key={g.id} className="mb-2.5 flex items-center gap-3 rounded-2xl bg-surface-1 px-4 py-3.5">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary-container text-lg">
            {GOAL_META[g.kind].emoji}
          </span>
          <button onClick={() => setEditing(g)} className="flex-1 text-left">
            <span className="block text-sm font-bold">{g.name}</span>
            <span className="block text-xs text-ink-variant">
              {inr(g.amountToday)} today · age {g.targetAge} · {YEAR + (g.targetAge - p.currentAge)}
            </span>
          </button>
          <button onClick={() => setInput({ ...input, goals: input.goals.filter((x) => x.id !== g.id) })}
                  aria-label={`Remove ${g.name}`}
                  className="rounded-full p-2 text-ink-outline transition hover:bg-danger-container hover:text-danger">
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={() => setEditing({
          id: crypto.randomUUID(), kind: 'car', name: 'Car',
          amountToday: 500_000, targetAge: p.currentAge + 5, inflation: 0.06, flexible: true,
        })}
        className="w-full rounded-2xl border border-dashed border-ink-outline py-4 text-sm font-bold text-primary transition hover:border-transparent hover:bg-primary-container">
        + Add a milestone
      </button>

      {editing && <GoalDialog goal={editing} profile={p} instruments={input.instruments}
                              onSave={save} onCancel={() => setEditing(null)} />}
    </>
  );
}

function GoalDialog({ goal, profile, instruments, onSave, onCancel }: {
  goal: Goal; profile: PlanInput['profile']; instruments: PlanInput['instruments'];
  onSave: (g: Goal) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(goal);
  const years = Math.max(0, draft.targetAge - profile.currentAge);
  const then = goalCostAtTarget(draft, profile.currentAge);
  const rate = years < 3 ? instruments.fd.rate : years < 7 ? 0.085 : instruments.eq.rate;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal>
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
                  className="max-h-[88vh] w-full max-w-[540px] overflow-y-auto rounded-xl3 bg-surface-1 p-6 shadow-e5">
        <h2 className="mb-4 text-xl font-bold">Milestone</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(GOAL_META) as Goal['kind'][]).map((kind) => (
            <button key={kind}
              onClick={() => setDraft({ ...draft, kind, name: GOAL_META[kind].label, inflation: GOAL_META[kind].inflation })}
              className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
                draft.kind === kind
                  ? 'border-transparent bg-secondary-container text-secondary-on'
                  : 'border-ink-outline text-ink-variant'}`}>
              {GOAL_META[kind].emoji} {GOAL_META[kind].label}
            </button>
          ))}
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[11px] font-semibold text-ink-variant">What is it?</span>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                 className="w-full rounded-xl border border-ink-outline bg-surface px-3.5 py-3 font-semibold outline-none focus:border-primary" />
        </label>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Cost in today's money" prefix="₹" value={draft.amountToday}
                 onChange={(v) => setDraft({ ...draft, amountToday: v })} />
          <Field label="You want it at age" suffix="yrs old" value={draft.targetAge}
                 onChange={(v) => setDraft({ ...draft, targetAge: v })} />
        </div>

        <Note>
          {years > 0 ? (
            <>At {pct(draft.inflation, 1)} inflation this costs <b>{inr(then)}</b> by{' '}
            {YEAR + years} — about <b>{rupees(sipForTarget(then, years, rate))}</b> a month from today,
            held in {years < 3 ? 'deposits' : years < 7 ? 'gold and PPF' : 'equity'} because it is{' '}
            {years} years out.</>
          ) : 'Pick an age in the future.'}
        </Note>

        <div className="mt-5 flex gap-3">
          <button onClick={() => onSave(draft)} className="m3-btn-filled flex-1">Save</button>
          <button onClick={onCancel} className="m3-btn-text">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}
