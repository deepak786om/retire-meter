import { describe, it, expect } from 'vitest';
import {
  fdMaturity, fdPrematureValue, ppfYear, sipForTarget, sipFutureValue,
  repairAmount, blendedReturn, compound,
} from '../src/lib/engine/instruments';
import {
  project, requiredCorpus, solveRequiredMonthly, solveRetirementAge, buildPlan,
  goalCostAtTarget,
} from '../src/lib/engine/projection';
import { suggestAllocation, allocationWarnings, horizonOf, canFund } from '../src/lib/engine/allocation';
import { INDIA_2026_27, thresholdAt } from '../src/lib/engine/rulepacks/india-2026-27';
import { DEFAULT_INPUT, INSTRUMENTS } from '../src/lib/engine/defaults';

describe('fixed deposits', () => {
  it('compounds quarterly, not simply', () => {
    // ₹1,00,000 @ 6% for 1 year, quarterly → 1.015^4
    expect(fdMaturity(100_000, 0.06, 1)).toBeCloseTo(106_136.355, 2);
    // The naive simple-interest answer would be 106,000 — we must be above it.
    expect(fdMaturity(100_000, 0.06, 1)).toBeGreaterThan(106_000);
  });

  it('honours the compounding frequency', () => {
    expect(fdMaturity(100_000, 0.06, 1, 1)).toBeCloseTo(106_000, 2);
    expect(fdMaturity(100_000, 0.06, 1, 12)).toBeGreaterThan(fdMaturity(100_000, 0.06, 1, 4));
  });

  it('re-rates on premature closure before applying the penalty', () => {
    // Contracted 6% for 1yr, broken at 7 months. Card rate for 7 months is 5.25%,
    // penalty 0.5% → applicable 4.75%, NOT 5.5%.
    const actual = fdPrematureValue(100_000, 0.0525, 0.005, 7 / 12);
    const naive = compound(100_000, 0.06, 7 / 12);
    expect(actual).toBeCloseTo(102_792.80, 0);
    expect(naive - actual).toBeGreaterThan(700); // a naive app overstates by ~₹742
  });

  it('a 1% lower rate costs more than the interest lost', () => {
    const gap = fdMaturity(200_000, 0.06, 1) - fdMaturity(200_000, 0.05, 1);
    expect(gap).toBeCloseTo(2_083.64, 0);
    // Repaired into equity at 11%, the top-up needed today is LESS than the gap,
    // because money injected now compounds for one extra year.
    const topUp = repairAmount(gap, 0.11);
    expect(topUp).toBeLessThan(gap);
    expect(topUp).toBeCloseTo(1_877.15, 0);
  });
});

describe('PPF conventions', () => {
  it('credits interest only on the lowest balance between the 5th and month end', () => {
    const early = ppfYear(0, 12_500, 3, 0.071);
    const late = ppfYear(0, 12_500, 20, 0.071);
    expect(early.interest).toBeGreaterThan(late.interest);
    // Contributing after the 5th forfeits one month of interest on each instalment.
    expect(early.interest - late.interest).toBeCloseTo(12_500 * 0.071 / 12 * 12, 0);
  });

  it('a full year at the cap lands where the scheme says it should', () => {
    const { closing } = ppfYear(0, 12_500, 1, 0.071);
    expect(closing).toBeGreaterThan(150_000);
    expect(closing).toBeLessThan(157_000);
  });
});

describe('SIP maths', () => {
  it('round-trips against future value', () => {
    const target = 5_000_000;
    const monthly = sipForTarget(target, 15, 0.11);
    expect(sipFutureValue(monthly, 15, 0.11)).toBeCloseTo(target, 0);
  });

  it('needs more per month at a lower return', () => {
    expect(sipForTarget(1e6, 10, 0.06)).toBeGreaterThan(sipForTarget(1e6, 10, 0.11));
  });
});

describe('blended return', () => {
  it('is weighted by where money actually goes', () => {
    const b = blendedReturn({ eq: 30_000, fd: 10_000 }, { eq: 0.11, fd: 0.0625 });
    expect(b).toBeCloseTo(0.098125, 6);
  });

  it('falls when money moves from equity to deposits', () => {
    const before = blendedReturn({ eq: 30_000, fd: 10_000 }, { eq: 0.11, fd: 0.0625 });
    const after = blendedReturn({ eq: 25_000, fd: 15_000 }, { eq: 0.11, fd: 0.0625 });
    expect(after).toBeLessThan(before);
  });
});

describe('projection', () => {
  it('runs from current age to terminal age inclusive', () => {
    const rows = project(DEFAULT_INPUT);
    expect(rows[0].age).toBe(DEFAULT_INPUT.profile.currentAge);
    expect(rows[rows.length - 1].age).toBe(DEFAULT_INPUT.profile.terminalAge);
  });

  it('draws goals out of the corpus in the year they fall due', () => {
    const carAge = DEFAULT_INPUT.goals[0].targetAge;
    const rows = project(DEFAULT_INPUT);
    const row = rows.find(r => r.age === carAge)!;
    expect(row.goalOutflow).toBeGreaterThan(0);
  });

  it('inflates a goal to its target year', () => {
    const car = DEFAULT_INPUT.goals[0];
    const cost = goalCostAtTarget(car, DEFAULT_INPUT.profile.currentAge);
    expect(cost).toBeGreaterThan(car.amountToday);
  });

  it('competing goals make retirement harder, not independent', () => {
    const withGoals = requiredMonthlyOf(DEFAULT_INPUT);
    const withoutGoals = requiredMonthlyOf({ ...DEFAULT_INPUT, goals: [] });
    expect(withGoals!).toBeGreaterThan(withoutGoals!);
  });
});

const requiredMonthlyOf = (i: typeof DEFAULT_INPUT) => solveRequiredMonthly(i);

describe('solvers', () => {
  it('required monthly actually closes the gap', () => {
    const req = solveRequiredMonthly(DEFAULT_INPUT)!;
    const rows = project(DEFAULT_INPUT, { monthlySavings: req });
    const atRet = rows.find(r => r.age === DEFAULT_INPUT.profile.retirementAge)!.closingCorpus;
    expect(atRet).toBeGreaterThanOrEqual(requiredCorpus(DEFAULT_INPUT) * 0.999);
  });

  it('returns null rather than a fantasy number when nothing works', () => {
    const impossible = {
      ...DEFAULT_INPUT,
      profile: { ...DEFAULT_INPUT.profile, monthlyExpense: 5_000_000, retirementAge: 34 },
    };
    expect(solveRequiredMonthly(impossible)).toBeNull();
  });

  it('retiring later needs less per month', () => {
    const at58 = solveRequiredMonthly(DEFAULT_INPUT, 58)!;
    const at62 = solveRequiredMonthly(DEFAULT_INPUT, 62)!;
    expect(at62).toBeLessThan(at58);
  });

  it('a longer terminal age needs a bigger corpus', () => {
    const to90 = requiredCorpus(DEFAULT_INPUT);
    const to95 = requiredCorpus({
      ...DEFAULT_INPUT,
      profile: { ...DEFAULT_INPUT.profile, terminalAge: 95 },
    });
    expect(to95).toBeGreaterThan(to90);
  });

  it('finds a reachable retirement age', () => {
    const age = solveRetirementAge(DEFAULT_INPUT, 55_000);
    expect(age === null || age > DEFAULT_INPUT.profile.currentAge).toBe(true);
  });
});

describe('safe withdrawal rate is derived, not asserted', () => {
  it('lands well below the American 4% rule under Indian inflation', () => {
    const plan = buildPlan(DEFAULT_INPUT);
    expect(plan.safeWithdrawalRate).toBeLessThan(0.04);
    expect(plan.safeWithdrawalRate).toBeGreaterThan(0.015);
  });

  it('falls further when inflation rises', () => {
    const base = buildPlan(DEFAULT_INPUT).safeWithdrawalRate;
    const hotter = buildPlan({
      ...DEFAULT_INPUT,
      market: { ...DEFAULT_INPUT.market, generalInflation: 0.08 },
      profile: { ...DEFAULT_INPUT.profile, lifestyleInflation: 0.08 },
    }).safeWithdrawalRate;
    expect(hotter).toBeLessThan(base);
  });
});

describe('allocation', () => {
  it('buckets goals by horizon', () => {
    expect(horizonOf(2)).toBe('near');
    expect(horizonOf(5)).toBe('mid');
    expect(horizonOf(20)).toBe('far');
  });

  it('suggests a split that sums to roughly the required monthly', () => {
    const req = solveRequiredMonthly(DEFAULT_INPUT)!;
    const alloc = suggestAllocation(DEFAULT_INPUT, req);
    const total = Object.values(alloc).reduce((a, b) => a + b, 0);
    expect(Math.abs(total - req) / req).toBeLessThan(0.05);
  });

  it('warns when locked instruments crowd out nearer goals', () => {
    const warnings = allocationWarnings(DEFAULT_INPUT, { epf: 40_000, ppf: 20_000, eq: 5_000 });
    expect(warnings.some(w => w.title.includes('locked'))).toBe(true);
  });

  it('warns when near-term goals lose their capital protection', () => {
    // The default car sits exactly 3 years out, which buckets as mid — so the
    // fixture needs a genuinely near-term goal for this rule to have anything to say.
    const soon = {
      ...DEFAULT_INPUT,
      goals: [
        ...DEFAULT_INPUT.goals,
        { id: 'g4', kind: 'travel' as const, name: 'Japan', amountToday: 600_000,
          targetAge: 34, inflation: 0.075, flexible: true },
      ],
    };
    const warnings = allocationWarnings(soon, { eq: 60_000 });
    expect(warnings.some(w => w.title.includes('Near-term'))).toBe(true);
    // ...and stays quiet once that money is properly protected.
    const protectedAlloc = allocationWarnings(soon, { eq: 30_000, fd: 250_000, cash: 20_000 });
    expect(protectedAlloc.some(w => w.title.includes('Near-term'))).toBe(false);
  });

  it('refuses to let EPF fund a pre-retirement goal', () => {
    const house = DEFAULT_INPUT.goals.find(g => g.kind === 'house')!;
    expect(canFund(INSTRUMENTS.epf, house, 32, 2026)).toBe(false);
    expect(canFund(INSTRUMENTS.eq, house, 32, 2026)).toBe(true);
  });
});

describe('rule pack', () => {
  it('carries provenance on every rate', () => {
    for (const [, v] of Object.entries(INDIA_2026_27.statutoryRates)) {
      expect(v.source.length).toBeGreaterThan(0);
      expect(v.asOf.length).toBeGreaterThan(0);
    }
  });

  it('encodes the post-July-2024 capital gains position', () => {
    expect(INDIA_2026_27.capitalGains.equity.longTermRate).toBe(0.125);
    expect(INDIA_2026_27.capitalGains.equity.annualExemption).toBe(125_000);
    expect(INDIA_2026_27.capitalGains.debt_fund.shortTermRate).toBe('slab');
  });

  it('models fiscal drag — frozen thresholds lose real value', () => {
    const base = INDIA_2026_27.thresholds.rebateThreshold.value;
    const frozen = thresholdAt(base, 'frozen', 0.06, 26);
    const indexed = thresholdAt(base, 'indexed', 0.06, 26);
    expect(frozen).toBe(base);
    expect(indexed).toBeGreaterThan(frozen * 4);
  });
});
