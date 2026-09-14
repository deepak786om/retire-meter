import type { TypedClient } from './supabase/server';
import type { PlanInput, Goal } from './engine/types';
import { DEFAULT_INPUT, INSTRUMENTS, DEFAULT_MARKET } from './engine/defaults';

export interface MonthCell {
  fyYear: number; monthIndex: number;
  planned: number; actual: number; confirmed: boolean;
}

/**
 * Assemble a PlanInput from the database.
 *
 * Falls back to defaults for anything the user has not set yet, so a brand-new
 * account still produces a working projection rather than a blank screen.
 */
export async function loadPlanInput(
  supabase: TypedClient, userId: string
): Promise<{ input: PlanInput; months: MonthCell[] }> {
  const [profileRes, goalsRes, holdingsRes, allocRes, monthRes, instRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('goals').select('*').eq('user_id', userId).is('archived_at', null).order('target_age'),
    supabase.from('holdings').select('instrument_key,current_value').eq('user_id', userId),
    supabase.from('allocations').select('instrument_key,monthly_amount').eq('user_id', userId),
    supabase.from('month_status').select('*').eq('user_id', userId).order('fy_year').order('month_index'),
    supabase.from('instruments').select('*').eq('user_id', userId),
  ]);

  const p = profileRes.data;

  const instruments = instRes.data?.length
    ? Object.fromEntries(instRes.data.map((i) => [i.key, {
        key: i.key, label: i.label, archetype: i.archetype, rateKind: i.rate_kind,
        rate: Number(i.rate), source: i.rate_source,
        lockedUntilAge: i.locked_until_age, maturityYear: i.maturity_year,
        compounding: i.compounding,
      }]))
    : INSTRUMENTS;

  const goals: Goal[] = (goalsRes.data ?? []).map((g) => ({
    id: g.id, kind: g.kind, name: g.name,
    amountToday: Number(g.amount_today), targetAge: g.target_age,
    inflation: Number(g.inflation), flexible: g.flexible,
  }));

  // Holdings can repeat per instrument (many stocks under 'st'), so aggregate.
  const byKey = new Map<string, number>();
  for (const h of holdingsRes.data ?? []) {
    byKey.set(h.instrument_key, (byKey.get(h.instrument_key) ?? 0) + Number(h.current_value));
  }

  const allocation = Object.fromEntries(
    (allocRes.data ?? []).map((a) => [a.instrument_key, Number(a.monthly_amount)])
  );

  const input: PlanInput = {
    profile: p ? {
      currentAge: p.current_age,
      retirementAge: p.retirement_age,
      terminalAge: p.terminal_age,
      monthlyIncome: Number(p.monthly_income),
      monthlyExpense: Number(p.monthly_expense),
      monthlySavings: Number(p.monthly_savings),
      salaryGrowth: Number(p.salary_growth),
      lifestyleInflation: Number(p.lifestyle_inflation),
      travelPerYearNow: Number(p.travel_per_year_now),
      travelPerYearRetired: Number(p.travel_per_year_retired),
      medicalPerYearNow: Number(p.medical_per_year_now),
    } : DEFAULT_INPUT.profile,
    goals: goals.length ? goals : DEFAULT_INPUT.goals,
    instruments,
    holdings: byKey.size
      ? [...byKey].map(([key, value]) => ({ key, value }))
      : DEFAULT_INPUT.holdings,
    market: DEFAULT_MARKET,
    allocation: Object.keys(allocation).length ? allocation : DEFAULT_INPUT.allocation,
  };

  const months: MonthCell[] = (monthRes.data ?? []).map((m) => ({
    fyYear: m.fy_year, monthIndex: m.month_index,
    planned: Number(m.planned), actual: Number(m.actual),
    confirmed: m.confirmed_at !== null,
  }));

  return { input, months };
}
