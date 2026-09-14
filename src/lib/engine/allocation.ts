import type { PlanInput, Goal, Instrument } from './types';
import { goalCostAtTarget, requiredCorpus } from './projection';
import { sipForTarget } from './instruments';

export type Horizon = 'near' | 'mid' | 'far';

/** Horizon decides the instrument. This is arithmetic, not preference. */
export function horizonOf(years: number): Horizon {
  if (years < 3) return 'near';
  if (years < 7) return 'mid';
  return 'far';
}

/** Archetype mix per horizon. Near-term money cannot take a drawdown. */
const MIX: Record<Horizon, Partial<Record<string, number>>> = {
  near: { deposit: 0.70, cash: 0.30 },
  mid:  { balanced: 0.35, locked_free: 0.35, deposit: 0.30 },
  far:  { growth: 0.67, locked_deferred: 0.33 },
};

/**
 * Suggested monthly split across instruments, derived from when each goal is due.
 * Not a model portfolio — a consequence of the timeline.
 */
export function suggestAllocation(
  input: PlanInput,
  requiredMonthly: number
): Record<string, number> {
  const { profile: p, goals, instruments } = input;

  const weight: Record<Horizon, number> = { near: 0, mid: 0, far: 0 };
  for (const g of goals) {
    const years = g.targetAge - p.currentAge;
    if (years < 0) continue;
    weight[horizonOf(years)] += goalCostAtTarget(g, p.currentAge);
  }
  // Retirement itself is the largest far-horizon claim.
  weight.far += requiredCorpus(input) * 0.55;

  const total = weight.near + weight.mid + weight.far || 1;

  // Distribute each horizon's share across instruments of the right archetype.
  const out: Record<string, number> = {};
  for (const h of ['near', 'mid', 'far'] as Horizon[]) {
    const share = weight[h] / total;
    if (share <= 0) continue;
    for (const [archetype, portion] of Object.entries(MIX[h])) {
      const matches = Object.values(instruments).filter(i => i.archetype === archetype);
      if (!matches.length) continue;
      const each = (share * (portion as number)) / matches.length;
      for (const inst of matches) {
        out[inst.key] = (out[inst.key] ?? 0) + requiredMonthly * each;
      }
    }
  }

  // Round, drop noise.
  for (const k of Object.keys(out)) {
    out[k] = Math.round(out[k] / 100) * 100;
    if (out[k] < 100) delete out[k];
  }
  return out;
}

export interface AllocationWarning {
  severity: 'warn' | 'error';
  title: string;
  detail: string;
}

/**
 * Warnings, never blocks. The user's risk appetite is theirs; our job is to make
 * sure they can see what they are trading away.
 */
export function allocationWarnings(
  input: PlanInput,
  allocation: Record<string, number>
): AllocationWarning[] {
  const out: AllocationWarning[] = [];
  const { profile: p, goals, instruments } = input;
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (total <= 0) return out;

  const byArchetype = (a: string) =>
    Object.entries(allocation)
      .filter(([k]) => instruments[k]?.archetype === a)
      .reduce((s, [, v]) => s + v, 0);

  // 1. Near-term goals exposed to markets.
  const nearGoals = goals.filter(g => horizonOf(g.targetAge - p.currentAge) === 'near');
  if (nearGoals.length) {
    const needed = nearGoals.reduce((s, g) => {
      const years = g.targetAge - p.currentAge;
      const depositRate = Object.values(instruments)
        .find(i => i.archetype === 'deposit')?.rate ?? 0.06;
      return s + sipForTarget(goalCostAtTarget(g, p.currentAge), years, depositRate);
    }, 0);
    const safe = byArchetype('deposit') + byArchetype('cash');
    if (safe < needed * 0.9) {
      out.push({
        severity: 'warn',
        title: 'Near-term goals are exposed',
        detail: `Goals inside three years need about ₹${Math.round(needed).toLocaleString('en-IN')} a month in capital-protected form, but you have allocated ₹${Math.round(safe).toLocaleString('en-IN')}. The shortfall now rides on markets in exactly the years you cannot afford a fall.`,
      });
    }
  }

  // 2. Too much in instruments that cannot fund pre-retirement goals.
  const locked = byArchetype('locked_deferred') + byArchetype('locked_free');
  if (locked / total > 0.55) {
    out.push({
      severity: 'warn',
      title: 'Most of your saving is locked away',
      detail: `${Math.round((locked / total) * 100)}% goes into instruments you cannot touch until retirement. Your total is unchanged but your nearer goals lose funding — same rupees, wrong pocket.`,
    });
  }

  // 3. No buffer at all.
  if (byArchetype('cash') / total < 0.03 && total > 0) {
    out.push({
      severity: 'warn',
      title: 'No liquid buffer',
      detail: 'Nothing is going into cash or liquid funds. An unplanned expense will be met by breaking something, and breaking an FD early costs more than people expect.',
    });
  }

  return out;
}

/** Is an instrument allowed to fund this goal? Lock-in and maturity decide, not preference. */
export function canFund(inst: Instrument, goal: Goal, currentAge: number, currentYear: number): boolean {
  if (inst.lockedUntilAge !== null && goal.targetAge < inst.lockedUntilAge) return false;
  if (inst.maturityYear !== null) {
    const goalYear = currentYear + (goal.targetAge - currentAge);
    if (goalYear < inst.maturityYear) return false;
  }
  return true;
}

/** Plain-language explanation of why an instrument sits where it does. */
export function tagFor(inst: Instrument): string {
  switch (inst.archetype) {
    case 'growth': return 'goals seven or more years out, and retirement';
    case 'balanced': return 'the three-to-seven year middle';
    case 'deposit': return 'goals inside three years';
    case 'locked_deferred': return `locked to ${inst.lockedUntilAge} — retirement only`;
    case 'locked_free': return inst.maturityYear
      ? `matures ${inst.maturityYear} — goals after that, plus retirement`
      : 'long-horizon, tax-free';
    case 'cash': return 'buffer and immediate needs';
  }
}
