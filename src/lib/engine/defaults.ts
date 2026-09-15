import type { Instrument, PlanInput, Goal, MarketAssumptions } from './types';
import { INDIA_2026_27 } from './rulepacks/india-2026-27';

const R = INDIA_2026_27.statutoryRates;
const W = INDIA_2026_27.withdrawalRules;

/**
 * India instrument set for FY2026-27.
 *
 * Contractual rates come from the rule pack — they are facts you can look up.
 * Assumed rates are long-run judgements, deliberately conservative, and every one
 * carries its source so the user can argue with it.
 */
export const INSTRUMENTS: Record<string, Instrument> = {
  eq: {
    key: 'eq', label: 'Equity mutual funds', archetype: 'growth', rateKind: 'assumed',
    rate: 0.11, source: 'NSE Nifty 50 TRI returned 12.44% over the 20 years to Feb 2026; 11% used as a prudent planning figure',
    lockedUntilAge: null, maturityYear: null, compounding: 1,
  },
  st: {
    key: 'st', label: 'Direct stocks', archetype: 'growth', rateKind: 'assumed',
    rate: 0.11, source: 'Same basis as equity funds',
    lockedUntilAge: null, maturityYear: null, compounding: 1,
  },
  nps: {
    key: 'nps', label: 'NPS Tier I · Scheme E', archetype: 'locked_deferred', rateKind: 'assumed',
    rate: 0.115, source: 'NPS Trust, 10-year scheme returns',
    lockedUntilAge: W.nps_tier1.lockedUntilAge, maturityYear: null, compounding: 1,
  },
  epf: {
    key: 'epf', label: 'EPF / VPF', archetype: 'locked_deferred', rateKind: 'contractual',
    rate: R.epf.rate, source: `${R.epf.source}, ${R.epf.asOf}`,
    lockedUntilAge: W.epf.lockedUntilAge, maturityYear: null, compounding: 1,
  },
  ppf: {
    key: 'ppf', label: 'PPF', archetype: 'locked_free', rateKind: 'contractual',
    rate: R.ppf.rate, source: `${R.ppf.source}, ${R.ppf.asOf}`,
    lockedUntilAge: null, maturityYear: 2034, compounding: 1,
  },
  gold: {
    key: 'gold', label: 'Gold / SGB', archetype: 'balanced', rateKind: 'assumed',
    rate: 0.10, source: '20-year average, partial inflation hedge',
    lockedUntilAge: null, maturityYear: null, compounding: 1,
  },
  fd: {
    key: 'fd', label: 'Fixed deposit', archetype: 'deposit', rateKind: 'contractual',
    rate: 0.0625, source: 'Your booked rate — edit to match what the bank gave you',
    lockedUntilAge: null, maturityYear: null, compounding: 4,
  },
  cash: {
    key: 'cash', label: 'Cash & liquid', archetype: 'cash', rateKind: 'contractual',
    rate: 0.035, source: 'Savings rate — below inflation, so surplus here costs you',
    lockedUntilAge: null, maturityYear: null, compounding: 4,
  },
};

export const DEFAULT_MARKET: MarketAssumptions = {
  generalInflation: 0.06,       // MoSPI CPI, 10-year average
  medicalMultiplier: 2.2,       // ~13% — insurer surveys 2025-26
  educationMultiplier: 1.8,     // ~11%
  travelInflation: 0.075,
  postRetirementReturn: 0.08,   // de-risked portfolio
};

export const DEFAULT_GOALS: Goal[] = [
  { id: 'g1', kind: 'car', name: 'Car', amountToday: 1_800_000, targetAge: 35, inflation: 0.06, flexible: true, priority: 30 },
  { id: 'g2', kind: 'house', name: 'House down payment', amountToday: 3_000_000, targetAge: 38, inflation: 0.07, flexible: false, priority: 10 },
  { id: 'g3', kind: 'business', name: 'Start the business', amountToday: 4_000_000, targetAge: 45, inflation: 0.06, flexible: true, priority: 70 },
];

export const DEFAULT_INPUT: PlanInput = {
  profile: {
    currentAge: 32,
    retirementAge: 58,
    terminalAge: 90,
    monthlyIncome: 155_000,
    monthlyExpense: 75_000,
    monthlySavings: 55_000,
    salaryGrowth: 0.08,
    lifestyleInflation: 0.06,
    travelPerYearNow: 100_000,
    travelPerYearRetired: 250_000,
    medicalPerYearNow: 36_000,
  },
  goals: DEFAULT_GOALS,
  instruments: INSTRUMENTS,
  holdings: [
    { key: 'eq', value: 1_800_000 },
    { key: 'st', value: 910_000 },
    { key: 'epf', value: 820_000 },
    { key: 'ppf', value: 410_000 },
    { key: 'nps', value: 310_000 },
    { key: 'fd', value: 210_000 },
    { key: 'gold', value: 150_000 },
    { key: 'cash', value: 100_000 },
  ],
  market: DEFAULT_MARKET,
  allocation: { eq: 25_000, epf: 19_800, fd: 6_000, gold: 4_200 },
};

export const GOAL_META: Record<Goal['kind'], { emoji: string; label: string; inflation: number }> = {
  car:       { emoji: '🚗', label: 'Car', inflation: 0.06 },
  house:     { emoji: '🏠', label: 'House', inflation: 0.07 },
  education: { emoji: '🎓', label: 'Education', inflation: 0.11 },
  business:  { emoji: '💼', label: 'Business', inflation: 0.06 },
  wedding:   { emoji: '💍', label: 'Wedding', inflation: 0.08 },
  travel:    { emoji: '✈️', label: 'Big trip', inflation: 0.075 },
  other:     { emoji: '⭐', label: 'Other', inflation: 0.06 },
};
