import type { Goal, Instrument, PlanInput } from './types';
import { goalCostAtTarget } from './projection';
import { sipForTarget } from './instruments';
import { tagsFor, horizonOf } from './allocation';

/**
 * Goal funding: attributing real money to real milestones.
 *
 * The problem this solves: contributions are logged to INSTRUMENTS, not to goals.
 * You put ₹25,000 into equity, not ₹25,000 "for the house". So the app has to
 * attribute — and how it attributes changes what it tells you.
 *
 * We use a WATERFALL, not a proportional split. Proportional smoothing would tell
 * you the car is 60% funded while that money sits in equity it cannot safely draw
 * on two years out. The waterfall fills one goal at a time, so a shortfall is real
 * and actionable rather than averaged away.
 *
 * Order is PRIORITY first, then horizon. A low-priority car should not drain a
 * high-priority house simply because it happens to fall sooner.
 */

export interface GoalProgress {
  goal: Goal;
  yearsAway: number;
  /** Cost inflated to the target year. */
  targetAmount: number;
  /** Attributed from eligible instruments via the waterfall. */
  accumulated: number;
  percentFunded: number;
  /** Contribution the goal needs from today to land on time. */
  requiredMonthly: number;
  /**
   * Ahead or behind expressed in MONTHS of contribution, not a percentage.
   * "62% funded" is meaningless without knowing how long is left;
   * "four months behind" is something you can act on this week.
   */
  monthsBehind: number;
  catchUpAmount: number;
  fundedBy: Array<{ key: string; label: string; value: number }>;
  /** Near-dated money sitting in something that could fall before it is spent. */
  exposureWarning?: string;
  /** Glide path status for goals approaching their date. */
  glide?: GlideStatus;
  status: 'on_track' | 'behind' | 'at_risk' | 'funded' | 'completed';
}

export interface GlideStatus {
  /** Fraction that should now be in capital-protected form. */
  targetSafeFraction: number;
  actualSafeFraction: number;
  /** Rupees that should be moved out of growth this quarter. */
  moveNow: number;
  message: string;
}

const PROTECTED: Array<Instrument['archetype']> = ['deposit', 'cash'];

/**
 * Glide path.
 *
 * The failure this prevents: someone saves correctly for eight years and loses a
 * quarter of their house deposit in the final six months because nobody moved it
 * to safety. De-risking starts 36 months out and completes by 6 months out.
 */
export function glideTarget(yearsAway: number): number {
  const months = yearsAway * 12;
  if (months >= 36) return 0;
  if (months <= 6) return 1;
  return (36 - months) / 30;
}

function safeFraction(
  instruments: Record<string, Instrument>,
  holdings: Record<string, number>
): number {
  const total = Object.values(holdings).reduce((a, b) => a + b, 0);
  if (total <= 0) return 1;
  const safe = Object.entries(holdings)
    .filter(([k]) => PROTECTED.includes(instruments[k]?.archetype))
    .reduce((s, [, v]) => s + v, 0);
  return safe / total;
}

/** Priority first, then soonest. Ties broken by date. */
function fundingOrder(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const pa = a.priority ?? 50;
    const pb = b.priority ?? 50;
    if (pa !== pb) return pa - pb;          // lower number = higher priority
    return a.targetAge - b.targetAge;
  });
}

/**
 * Run the waterfall.
 *
 * Each instrument's balance is offered to goals in priority order, but only to
 * goals it is actually eligible for — lock-in and horizon suitability both apply.
 * Whatever is left over after every goal is filled backs retirement, which is why
 * locked instruments are never wasted.
 */
export function computeGoalProgress(
  input: PlanInput,
  /** Current balance per instrument key. */
  balances: Record<string, number>,
  /** Months of contributions logged so far, for the behind/ahead calculation. */
  monthsElapsed = 0
): { goals: GoalProgress[]; leftoverForRetirement: number } {
  const { profile: p, instruments, goals } = input;
  const remaining = { ...balances };
  const out: GoalProgress[] = [];

  for (const goal of fundingOrder(goals)) {
    const yearsAway = goal.targetAge - p.currentAge;
    const targetAmount = goalCostAtTarget(goal, p.currentAge);
    const tags = tagsFor as typeof tagsFor;

    // Which instruments may fund this goal at all.
    const eligibleKeys = Object.values(instruments)
      .filter((inst) => tags(inst, [goal], p.currentAge)[0].eligible)
      .map((inst) => inst.key);

    let accumulated = 0;
    const fundedBy: GoalProgress['fundedBy'] = [];

    for (const key of eligibleKeys) {
      const available = remaining[key] ?? 0;
      if (available <= 0) continue;
      const take = Math.min(available, targetAmount - accumulated);
      if (take <= 0) break;
      remaining[key] = available - take;
      accumulated += take;
      fundedBy.push({ key, label: instruments[key].label, value: take });
    }

    const horizonRate = yearsAway < 3 ? instruments.fd?.rate ?? 0.0625
      : yearsAway < 7 ? 0.085 : instruments.eq?.rate ?? 0.11;
    const requiredMonthly = sipForTarget(targetAmount, yearsAway, horizonRate);

    // Where should we be by now, given how long we have been at this?
    const expectedByNow = requiredMonthly * monthsElapsed;
    const behindBy = Math.max(0, expectedByNow - accumulated);
    const monthsBehind = requiredMonthly > 0 ? behindBy / requiredMonthly : 0;

    const percentFunded = targetAmount > 0
      ? Math.min(100, Math.round((accumulated / targetAmount) * 100)) : 100;

    // Glide path for anything inside three years.
    let glide: GlideStatus | undefined;
    if (yearsAway <= 3 && yearsAway >= 0 && accumulated > 0) {
      const fundedMap = Object.fromEntries(fundedBy.map((f) => [f.key, f.value]));
      const actual = safeFraction(instruments, fundedMap);
      const target = glideTarget(yearsAway);
      const moveNow = Math.max(0, (target - actual) * accumulated);
      if (moveNow > 1000) {
        glide = {
          targetSafeFraction: target, actualSafeFraction: actual, moveNow,
          message: `${Math.round(target * 100)}% of this should be in capital-protected form by now; ${Math.round(actual * 100)}% is. Move about ${Math.round(moveNow).toLocaleString('en-IN')} out of growth before a fall takes it.`,
        };
      }
    }

    /**
     * The real near-term exposure.
     *
     * Ineligible instruments never fund a near goal, so "this goal is held in
     * equity" cannot happen by construction. The genuine risk is subtler: a near
     * goal that is UNDERFUNDED by protected money, while growth balances sit
     * alongside it. Nothing stops you, on the day, from selling equity to cover
     * the gap — and if the market has fallen, that is exactly when you will.
     */
    let exposureWarning: string | undefined;
    if (horizonOf(yearsAway) === 'near' && accumulated < targetAmount) {
      const shortfall = targetAmount - accumulated;
      const growthAvailable = Object.entries(remaining)
        .filter(([k]) => instruments[k]?.archetype === 'growth')
        .reduce((s, [, v]) => s + v, 0);
      if (growthAvailable > 0) {
        exposureWarning =
          `Only ${yearsAway} year${yearsAway === 1 ? '' : 's'} away and short by ${Math.round(shortfall).toLocaleString('en-IN')}. Nothing stops you covering that from equity on the day — but if markets have fallen there is no time to recover from a bad year. Build the protected side now instead.`;
      }
    }

    const status: GoalProgress['status'] =
      goal.completedOn ? 'completed'
      : percentFunded >= 100 ? 'funded'
      : monthsBehind > 6 ? 'at_risk'
      : monthsBehind > 1 ? 'behind'
      : 'on_track';

    out.push({
      goal, yearsAway, targetAmount, accumulated, percentFunded,
      requiredMonthly, monthsBehind, catchUpAmount: behindBy,
      fundedBy, exposureWarning, glide, status,
    });
  }

  const leftoverForRetirement = Object.values(remaining).reduce((a, b) => a + b, 0);
  // Present in the user's own order, not the internal funding order.
  out.sort((a, b) => a.goal.targetAge - b.goal.targetAge);
  return { goals: out, leftoverForRetirement };
}

/**
 * Completing a goal.
 *
 * The plan figure is a pre-fill, never an assumption. Variance at completion is the
 * most informative number in the ledger — it reveals whether your estimates are
 * systematically optimistic, which matters far more for the goals still ahead than
 * for the one you have just paid for.
 */
export interface CompletionOutcome {
  planned: number;
  actual: number;
  variance: number;
  /** What the overspend costs at retirement, or the underspend gains. */
  corpusImpact: number;
  message: string;
}

export function completeGoal(
  progress: GoalProgress,
  actualSpent: number,
  blendedReturn: number,
  yearsToRetirement: number
): CompletionOutcome {
  const planned = progress.targetAmount;
  const variance = actualSpent - planned;
  const impact = variance * Math.pow(1 + blendedReturn, yearsToRetirement);

  const message = Math.abs(variance) < planned * 0.01
    ? 'Landed on plan. Nothing downstream changes.'
    : variance > 0
      ? `You spent ${Math.round(variance).toLocaleString('en-IN')} more than planned. That comes out of what was going to retirement — about ${Math.round(impact).toLocaleString('en-IN')} of corpus by the time you stop working.`
      : `You spent ${Math.round(-variance).toLocaleString('en-IN')} less than planned. That stays invested and is worth roughly ${Math.round(-impact).toLocaleString('en-IN')} at retirement.`;

  return { planned, actual: actualSpent, variance, corpusImpact: impact, message };
}

/**
 * Withdrawal classification.
 *
 * The type alone is not enough — the REASON changes what the app should say.
 * A goal spend was always going to happen. A discretionary raid genuinely sets the
 * plan back and should be costed in days on the needle.
 */
export type WithdrawalReason = 'goal_spend' | 'unplanned' | 'discretionary' | 'rebalance';

export function describeWithdrawal(
  reason: WithdrawalReason,
  amount: number,
  instrument: Instrument,
  blendedReturn: number,
  yearsToRetirement: number
): { tone: 'neutral' | 'warn' | 'bad'; message: string } {
  const impact = amount * Math.pow(1 + blendedReturn, yearsToRetirement);
  const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  if (reason === 'goal_spend') {
    return { tone: 'neutral', message: 'Expected. This milestone was always going to cost this.' };
  }
  if (reason === 'rebalance') {
    return { tone: 'neutral', message: 'Moving between instruments. Net worth is unchanged; only the shape of it moved.' };
  }

  const base = `${inr(amount)} out now is about ${inr(impact)} less at retirement.`;

  if (instrument.archetype === 'growth') {
    return {
      tone: 'bad',
      message: `${base} Selling equity also consumes part of this year's capital gains exemption, which never carries forward. If markets are down, this is the most expensive place you could have taken it from.`,
    };
  }
  if (instrument.archetype === 'deposit') {
    return {
      tone: 'warn',
      message: `${base} Breaking a deposit early re-rates it to the card rate for the period actually held, then applies a penalty on top — the payout is lower than the contracted rate implies.`,
    };
  }
  return { tone: reason === 'discretionary' ? 'bad' : 'warn', message: base };
}
