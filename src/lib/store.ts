'use client';

import { create } from 'zustand';
import type { PlanInput, Goal, PlanResult } from './engine/types';
import { DEFAULT_INPUT } from './engine/defaults';
import { buildPlan, solveRequiredMonthly } from './engine/projection';
import { suggestAllocation } from './engine/allocation';
import { createClient } from './supabase/client';

/**
 * One source of truth for the plan.
 *
 * The engine is pure and synchronous, so we can re-solve on every edit without a
 * round trip. Persistence is debounced and fire-and-forget — the UI never waits
 * on the network to show you a number.
 */

interface PlanStore {
  input: PlanInput;
  result: PlanResult;
  dirty: boolean;
  lastMessage: string | null;

  setProfile: (patch: Partial<PlanInput['profile']>) => void;
  upsertGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  setRate: (key: string, rate: number) => void;
  setAllocation: (key: string, amount: number) => void;
  resetAllocation: () => void;
  resetRates: () => void;
  resetAll: () => void;
  say: (message: string | null) => void;
  persist: (userId: string) => Promise<void>;
  hydrate: (input: PlanInput) => void;
}

const recompute = (input: PlanInput) => buildPlan(input);

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const usePlan = create<PlanStore>((set, get) => ({
  input: DEFAULT_INPUT,
  result: recompute(DEFAULT_INPUT),
  dirty: false,
  lastMessage: null,

  setProfile: (patch) =>
    set((s) => {
      const input = { ...s.input, profile: { ...s.input.profile, ...patch } };
      return { input, result: recompute(input), dirty: true };
    }),

  upsertGoal: (goal) =>
    set((s) => {
      const goals = s.input.goals.some((g) => g.id === goal.id)
        ? s.input.goals.map((g) => (g.id === goal.id ? goal : g))
        : [...s.input.goals, goal];
      goals.sort((a, b) => a.targetAge - b.targetAge);
      // A new goal changes the horizon mix, so the suggested split is stale.
      const input = { ...s.input, goals };
      const required = solveRequiredMonthly(input) ?? 0;
      input.allocation = suggestAllocation(input, required);
      return { input, result: recompute(input), dirty: true };
    }),

  removeGoal: (id) =>
    set((s) => {
      const input = { ...s.input, goals: s.input.goals.filter((g) => g.id !== id) };
      const required = solveRequiredMonthly(input) ?? 0;
      input.allocation = suggestAllocation(input, required);
      return { input, result: recompute(input), dirty: true };
    }),

  setRate: (key, rate) =>
    set((s) => {
      const inst = s.input.instruments[key];
      if (!inst) return s;
      const input = {
        ...s.input,
        instruments: { ...s.input.instruments, [key]: { ...inst, rate } },
      };
      return { input, result: recompute(input), dirty: true };
    }),

  setAllocation: (key, amount) =>
    set((s) => {
      const input = { ...s.input, allocation: { ...s.input.allocation, [key]: Math.max(0, amount) } };
      return { input, result: recompute(input), dirty: true };
    }),

  resetAllocation: () =>
    set((s) => {
      const required = solveRequiredMonthly(s.input) ?? 0;
      const input = { ...s.input, allocation: suggestAllocation(s.input, required) };
      return { input, result: recompute(input), dirty: true, lastMessage: 'Back to the horizon-based split.' };
    }),

  resetRates: () =>
    set((s) => {
      const instruments = Object.fromEntries(
        Object.entries(s.input.instruments).map(([k, inst]) => [
          k, { ...inst, rate: DEFAULT_INPUT.instruments[k]?.rate ?? inst.rate },
        ])
      );
      const input = { ...s.input, instruments };
      return { input, result: recompute(input), dirty: true, lastMessage: 'Rates back to researched defaults.' };
    }),

  resetAll: () =>
    set({ input: DEFAULT_INPUT, result: recompute(DEFAULT_INPUT), dirty: true,
          lastMessage: 'Everything reset to defaults.' }),

  say: (lastMessage) => set({ lastMessage }),

  hydrate: (input) => set({ input, result: recompute(input), dirty: false }),

  /** Debounced write-behind. Never blocks the UI. */
  persist: async (userId) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { input } = get();
      const supabase = createClient();
      const p = input.profile;

      await supabase.from('profiles').update({
        current_age: p.currentAge,
        retirement_age: p.retirementAge,
        terminal_age: p.terminalAge,
        monthly_income: p.monthlyIncome,
        monthly_expense: p.monthlyExpense,
        monthly_savings: p.monthlySavings,
        salary_growth: p.salaryGrowth,
        lifestyle_inflation: p.lifestyleInflation,
        travel_per_year_now: p.travelPerYearNow,
        travel_per_year_retired: p.travelPerYearRetired,
        medical_per_year_now: p.medicalPerYearNow,
      }).eq('id', userId);

      await supabase.from('allocations').upsert(
        Object.entries(input.allocation).map(([instrument_key, monthly_amount]) => ({
          user_id: userId, instrument_key, monthly_amount, is_override: true,
        })),
        { onConflict: 'user_id,instrument_key' }
      );

      set({ dirty: false });
    }, 800);
  },
}));
