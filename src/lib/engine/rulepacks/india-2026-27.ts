/**
 * India · FY2026-27 rule pack.
 *
 * Every jurisdiction-specific number lives here, effective-dated. The engine never
 * hardcodes a rate, a cap or a threshold. To support another country you add a pack;
 * you do not touch the engine.
 *
 * Verify against primary sources before each publish. Provenance is part of the data.
 */

export interface RulePack {
  jurisdiction: string;
  financialYear: string;
  effectiveFrom: string;
  effectiveTo: string;
  publishedOn: string;
  currency: string;
  /** Financial year start month, 1-indexed. India = April. */
  fyStartMonth: number;
  statutoryRates: Record<string, { rate: number; source: string; asOf: string }>;
  capitalGains: Record<string, {
    longTermRate: number;
    longTermHoldingMonths: number;
    shortTermRate: number | 'slab';
    annualExemption: number;
    indexation: boolean;
    source: string;
  }>;
  contributionCaps: Record<string, { cap: number; period: 'year'; source: string }>;
  withdrawalRules: Record<string, {
    lockedUntilAge: number | null;
    maturityYears: number | null;
    forcedAnnuityFraction?: number;
    note: string;
  }>;
  thresholds: Record<string, { value: number; source: string }>;
}

export const INDIA_2026_27: RulePack = {
  jurisdiction: 'IN',
  financialYear: 'FY2026-27',
  effectiveFrom: '2026-04-01',
  effectiveTo: '2027-03-31',
  publishedOn: '2026-06-14',
  currency: 'INR',
  fyStartMonth: 4,

  statutoryRates: {
    epf:  { rate: 0.0825, source: 'EPFO annual declaration', asOf: '2026-02' },
    ppf:  { rate: 0.0710, source: 'Ministry of Finance, small savings (quarterly reset)', asOf: '2026-04' },
    scss: { rate: 0.0820, source: 'Ministry of Finance, small savings', asOf: '2026-04' },
    nsc:  { rate: 0.0770, source: 'Ministry of Finance, small savings', asOf: '2026-04' },
    sgb_coupon: { rate: 0.0250, source: 'RBI SGB scheme terms', asOf: '2026-01' },
  },

  capitalGains: {
    equity: {
      longTermRate: 0.125,
      longTermHoldingMonths: 12,
      shortTermRate: 0.20,
      annualExemption: 125_000,
      indexation: false,
      source: 'Finance (No.2) Act 2024, effective 23 Jul 2024 — s.112A / s.111A',
    },
    debt_fund: {
      longTermRate: 0,
      longTermHoldingMonths: 0,
      shortTermRate: 'slab',
      annualExemption: 0,
      indexation: false,
      source: 'Section 50AA — units acquired on/after 1 Apr 2023 taxed at slab',
    },
    gold: {
      longTermRate: 0.125,
      longTermHoldingMonths: 24,
      shortTermRate: 'slab',
      annualExemption: 0,
      indexation: false,
      source: 'Finance (No.2) Act 2024',
    },
    property: {
      longTermRate: 0.125,
      longTermHoldingMonths: 24,
      shortTermRate: 'slab',
      annualExemption: 0,
      indexation: true, // 20%-with-indexation option survives for pre-23-Jul-2024 acquisitions
      source: 'Finance (No.2) Act 2024 — resident individuals may elect 20% with indexation',
    },
  },

  contributionCaps: {
    ppf:        { cap: 150_000, period: 'year', source: 'PPF Scheme rules' },
    section80c: { cap: 150_000, period: 'year', source: 'Old regime only' },
    nps_80ccd1b:{ cap: 50_000,  period: 'year', source: 'Old regime only' },
    scss:       { cap: 3_000_000, period: 'year', source: 'SCSS deposit ceiling' },
    epf_taxfree_interest: { cap: 250_000, period: 'year', source: 'Interest above this is taxable' },
  },

  withdrawalRules: {
    epf: {
      lockedUntilAge: 58, maturityYears: null,
      note: 'Locked to retirement. Narrow exceptions for housing, medical and marriage. EEE after five years of service.',
    },
    ppf: {
      lockedUntilAge: null, maturityYears: 15,
      note: 'Fifteen years from account opening, extendable in five-year blocks. Partial withdrawal from year seven.',
    },
    nps_tier1: {
      lockedUntilAge: 60, maturityYears: null, forcedAnnuityFraction: 0.40,
      note: 'At 60 a minimum 40% must purchase an annuity; the 60% lump sum is exempt under s.10(12A). Annuity income is taxed at slab. Deferral past 60 is permitted. PFRDA revised the corpus-slab framework in Dec 2025 — verify before relying on the split.',
    },
    nps_tier2: {
      lockedUntilAge: null, maturityYears: null,
      note: 'No lock-in and no additional deduction.',
    },
    elss: {
      lockedUntilAge: null, maturityYears: 3,
      note: 'Three years from each instalment, not from first investment.',
    },
  },

  thresholds: {
    standardDeduction:   { value: 75_000,  source: 'New regime (default)' },
    rebateThreshold:     { value: 1_200_000, source: 'Budget 2025 — effectively tax-free up to this' },
    seniorInterestRelief:{ value: 50_000,  source: 'Section 80TTB' },
    fdTdsThreshold:      { value: 100_000, source: 'TDS on FD interest above this from FY2025-26' },
  },
};

/**
 * Policy trajectory. Projecting thirty years while freezing today's thresholds is
 * a specific and wrong assumption — nominal thresholds that never move are a real
 * tax rise every year. The user chooses; the choice is labelled.
 */
export type PolicyTrajectory = 'frozen' | 'indexed' | 'custom';

export function thresholdAt(
  base: number, trajectory: PolicyTrajectory, inflation: number, years: number
): number {
  if (trajectory === 'indexed') return base * Math.pow(1 + inflation, years);
  return base; // frozen — real value erodes, which is the point
}
