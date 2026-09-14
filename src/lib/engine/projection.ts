import type {
  PlanInput, PlanResult, YearRow, Goal, Profile, MarketAssumptions, Instrument,
} from './types';
import { blendedReturn, inflate, sipForTarget } from './instruments';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Retirement spending is not flat. The observed pattern is three phases:
 *   go-go   (first ~12 yrs) — travel heavy
 *   slow-go (next ~10 yrs)  — travel tapers
 *   no-go   (beyond)        — travel near zero, medical dominant
 * Modelling flat spending overstates late travel and badly understates late medical.
 */
function travelTaper(yearsRetired: number): number {
  if (yearsRetired > 22) return 0.25;
  if (yearsRetired > 12) return 0.55;
  return 1;
}

export function goalCostAtTarget(goal: Goal, currentAge: number): number {
  return inflate(goal.amountToday, goal.inflation, Math.max(0, goal.targetAge - currentAge));
}

/** Living + travel + medical for one retired year, each on its own inflation path. */
function retiredOutflow(
  p: Profile, m: MarketAssumptions, t: number, yearsRetired: number
): number {
  const living = p.monthlyExpense * 12 * Math.pow(1 + p.lifestyleInflation, t);
  const travel = p.travelPerYearRetired
    * Math.pow(1 + m.travelInflation, t)
    * travelTaper(yearsRetired);
  const medical = p.medicalPerYearNow
    * Math.pow(1 + m.generalInflation * m.medicalMultiplier, t);
  return living + travel + medical;
}

function accessibleFraction(
  instruments: Record<string, Instrument>,
  allocation: Record<string, number>,
  age: number
): number {
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (total <= 0) return 1;
  let free = 0;
  for (const [key, amt] of Object.entries(allocation)) {
    const inst = instruments[key];
    if (!inst) { free += amt; continue; }
    if (inst.lockedUntilAge === null || age >= inst.lockedUntilAge) free += amt;
  }
  return free / total;
}

/** Year-by-year cash-flow projection. One pass, all goals competing. */
export function project(
  input: PlanInput,
  overrides?: { monthlySavings?: number; retirementAge?: number; preReturn?: number }
): YearRow[] {
  const { profile: p, goals, market: m, instruments, allocation } = input;
  const retirementAge = overrides?.retirementAge ?? p.retirementAge;
  const monthlySavings = overrides?.monthlySavings ?? p.monthlySavings;
  const rates = Object.fromEntries(
    Object.entries(instruments).map(([k, i]) => [k, i.rate])
  );
  const preReturn = overrides?.preReturn ?? blendedReturn(allocation, rates);

  let corpus = input.holdings.reduce((a, h) => a + h.value, 0);
  let annualSavings = monthlySavings * 12;
  const rows: YearRow[] = [];

  for (let age = p.currentAge; age <= p.terminalAge; age++) {
    const t = age - p.currentAge;
    const opening = corpus;
    const rate = age < retirementAge ? preReturn : m.postRetirementReturn;

    let contributions = 0;
    let livingOutflow = 0;

    if (age < retirementAge) {
      contributions = annualSavings;
      livingOutflow = p.travelPerYearNow * Math.pow(1 + m.travelInflation, t);
    } else {
      livingOutflow = retiredOutflow(p, m, t, age - retirementAge);
    }

    let goalOutflow = 0;
    for (const g of goals) {
      if (g.targetAge === age && age < retirementAge) {
        goalOutflow += goalCostAtTarget(g, p.currentAge);
      }
    }

    const growth = opening * rate;
    corpus = opening + growth + contributions - livingOutflow - goalOutflow;

    rows.push({
      age,
      year: CURRENT_YEAR + t,
      openingCorpus: opening,
      contributions,
      goalOutflow,
      livingOutflow,
      growth,
      closingCorpus: corpus,
      accessible: corpus * accessibleFraction(instruments, allocation, age),
    });

    annualSavings *= 1 + p.salaryGrowth;
  }

  return rows;
}

const corpusAt = (rows: YearRow[], age: number) =>
  rows.find(r => r.age === age)?.closingCorpus ?? 0;

/**
 * Corpus needed at retirement to survive to terminalAge.
 * Binary search over a full decumulation simulation rather than a naive
 * "expenses / SWR" shortcut, because spending is not flat and medical compounds
 * at a different rate from everything else.
 */
export function requiredCorpus(input: PlanInput, retirementAge?: number): number {
  const { profile: p, market: m } = input;
  const retAge = retirementAge ?? p.retirementAge;
  let lo = 0, hi = 5e9;

  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    let c = mid;
    let survives = true;
    for (let age = retAge; age <= p.terminalAge; age++) {
      const t = age - p.currentAge;
      c = c * (1 + m.postRetirementReturn) - retiredOutflow(p, m, t, age - retAge);
      if (c < 0) { survives = false; break; }
    }
    if (survives) hi = mid; else lo = mid;
  }
  return hi;
}

/**
 * Sustainable withdrawal rate implied by this plan, DERIVED rather than asserted.
 * India's lower figure emerges from its higher inflation, not from a hardcoded 3.25%.
 */
export function impliedSafeWithdrawalRate(input: PlanInput): number {
  const need = requiredCorpus(input);
  if (need <= 0) return 0;
  const { profile: p, market: m } = input;
  const t = p.retirementAge - p.currentAge;
  const firstYear = retiredOutflow(p, m, t, 0);
  return firstYear / need;
}

const MAX_SEARCH_MONTHLY = 2_000_000;

/** Monthly contribution required. null when no amount works. */
export function solveRequiredMonthly(
  input: PlanInput, retirementAge?: number
): number | null {
  const retAge = retirementAge ?? input.profile.retirementAge;
  const need = requiredCorpus(input, retAge);
  let lo = 0, hi = MAX_SEARCH_MONTHLY;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const rows = project(input, { monthlySavings: mid, retirementAge: retAge });
    if (corpusAt(rows, retAge) >= need) hi = mid; else lo = mid;
  }
  return hi > MAX_SEARCH_MONTHLY * 0.99 ? null : hi;
}

/** Earliest retirement age reachable at a given savings rate. */
export function solveRetirementAge(
  input: PlanInput, monthlySavings: number
): number | null {
  for (let age = input.profile.currentAge + 1; age <= 80; age++) {
    const rows = project(input, { monthlySavings, retirementAge: age });
    if (corpusAt(rows, age) >= requiredCorpus(input, age)) return age;
  }
  return null;
}

/** Highest monthly expense that still leaves the plan feasible. */
export function solveMaxExpense(input: PlanInput): number | null {
  let lo = 1000, hi = input.profile.monthlyExpense, found: number | null = null;
  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    const probe: PlanInput = {
      ...input,
      profile: { ...input.profile, monthlyExpense: mid },
    };
    const rows = project(probe);
    if (corpusAt(rows, probe.profile.retirementAge) >= requiredCorpus(probe)) {
      lo = mid; found = mid;
    } else hi = mid;
  }
  return found;
}

export function buildPlan(input: PlanInput): PlanResult {
  const rows = project(input);
  const { profile: p } = input;
  const rates = Object.fromEntries(
    Object.entries(input.instruments).map(([k, i]) => [k, i.rate])
  );

  const corpusAtRetirement = corpusAt(rows, p.retirementAge);
  const corpusRequired = requiredCorpus(input);
  const requiredMonthly = solveRequiredMonthly(input);

  let depletionAge: number | null = null;
  for (const r of rows) {
    if (r.age > p.retirementAge && r.closingCorpus <= 0) { depletionAge = r.age; break; }
  }

  return {
    rows,
    corpusAtRetirement,
    corpusRequired,
    gap: corpusRequired - corpusAtRetirement,
    feasible: requiredMonthly !== null && requiredMonthly <= p.monthlyIncome,
    requiredMonthly,
    blendedReturn: blendedReturn(input.allocation, rates),
    depletionAge,
    safeWithdrawalRate: impliedSafeWithdrawalRate(input),
  };
}

/** Monthly contribution each goal demands on its own, at a horizon-appropriate rate. */
export function goalMonthly(
  goal: Goal, currentAge: number, rateForHorizon: (years: number) => number
): number {
  const years = goal.targetAge - currentAge;
  return sipForTarget(goalCostAtTarget(goal, currentAge), years, rateForHorizon(years));
}
