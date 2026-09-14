/**
 * Core domain types.
 *
 * Design rule: the engine knows nothing about India. Anything jurisdiction-specific
 * (tax rules, statutory rates, account names) arrives via a RulePack. Anything
 * market-specific arrives via MarketAssumptions. Swap those two and the same
 * engine plans a retirement in Berlin.
 */

/** Every instrument reduces to one of these archetypes. */
export type Archetype =
  | 'growth'          // equity, equity funds — market-linked, long horizon
  | 'balanced'        // gold, hybrid — the middle
  | 'deposit'         // FD, RD — contractual rate, capital protected
  | 'locked_deferred' // EPF, NPS Tier I — locked to a retirement age, tax-deferred
  | 'locked_free'     // PPF, ISA-like — locked but tax-free, definite maturity
  | 'cash';           // savings, liquid

/** Where a rate comes from decides how much we trust it. */
export type RateKind = 'contractual' | 'assumed';

export interface Instrument {
  key: string;
  label: string;
  archetype: Archetype;
  rateKind: RateKind;
  /** Nominal annual rate as a fraction, e.g. 0.11 */
  rate: number;
  /** Provenance — shown to the user so every number can be checked. */
  source: string;
  /** Age before which money cannot be withdrawn. null = liquid. */
  lockedUntilAge: number | null;
  /** Absolute year of maturity, if the instrument has one (PPF). */
  maturityYear: number | null;
  /** Compounding periods per year. */
  compounding: number;
}

export type GoalKind =
  | 'car' | 'house' | 'education' | 'business'
  | 'wedding' | 'travel' | 'other';

export interface Goal {
  id: string;
  kind: GoalKind;
  name: string;
  /** Cost in TODAY's money. The engine inflates it. */
  amountToday: number;
  /** Age at which the money is spent. */
  targetAge: number;
  /** Category inflation as a fraction. Education != groceries. */
  inflation: number;
  /** Flexible goals can absorb a shock; fixed ones cannot. */
  flexible: boolean;
}

export interface Profile {
  currentAge: number;
  retirementAge: number;
  /** Plan must last to this age. Always > retirementAge. */
  terminalAge: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  /** Fractions per year. */
  salaryGrowth: number;
  lifestyleInflation: number;
  travelPerYearNow: number;
  travelPerYearRetired: number;
  medicalPerYearNow: number;
}

export interface MarketAssumptions {
  generalInflation: number;
  /** Category inflation expressed as a multiple of general CPI — remarkably
   *  stable across countries, which is what makes it portable. */
  medicalMultiplier: number;
  educationMultiplier: number;
  travelInflation: number;
  /** Real return used post-retirement, when the portfolio de-risks. */
  postRetirementReturn: number;
}

export interface Holding {
  key: string;      // matches Instrument.key
  value: number;
}

export interface PlanInput {
  profile: Profile;
  goals: Goal[];
  instruments: Record<string, Instrument>;
  /** Current balances by instrument key. */
  holdings: Holding[];
  market: MarketAssumptions;
  /** Monthly contribution split by instrument key. Drives the blended return. */
  allocation: Record<string, number>;
}

export interface YearRow {
  age: number;
  year: number;
  openingCorpus: number;
  contributions: number;
  goalOutflow: number;
  livingOutflow: number;
  growth: number;
  closingCorpus: number;
  /** Portion of corpus the person can actually touch at this age. */
  accessible: number;
}

export interface PlanResult {
  rows: YearRow[];
  corpusAtRetirement: number;
  corpusRequired: number;
  gap: number;
  feasible: boolean;
  requiredMonthly: number | null;
  blendedReturn: number;
  /** Age money runs out, or null if it lasts. */
  depletionAge: number | null;
  safeWithdrawalRate: number;
}

export type LedgerEntryType =
  | 'contribution' | 'withdrawal' | 'transfer' | 'rate_change';

export interface LedgerEntry {
  id: string;
  date: string;         // ISO yyyy-mm-dd
  type: LedgerEntryType;
  instrumentKey: string;
  label: string;
  amount: number;       // negative for withdrawals
  goalId: string | null;
  amendedFrom?: string;
}
