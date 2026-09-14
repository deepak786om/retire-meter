/**
 * Database types.
 *
 * In production, regenerate from the live schema so they can never drift:
 *   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 * Written by hand here so the repo type-checks without a live project.
 */
export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];
type Stamped = { created_at: string; updated_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Stamped & {
          id: string; display_name: string | null; jurisdiction: string; currency: string;
          current_age: number; retirement_age: number; terminal_age: number;
          monthly_income: number; monthly_expense: number; monthly_savings: number;
          salary_growth: number; lifestyle_inflation: number;
          travel_per_year_now: number; travel_per_year_retired: number; medical_per_year_now: number;
          policy_trajectory: 'frozen' | 'indexed' | 'custom';
        };
        Insert: { id: string } & Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      goals: {
        Row: Stamped & {
          id: string; user_id: string;
          kind: 'car' | 'house' | 'education' | 'business' | 'wedding' | 'travel' | 'other';
          name: string; amount_today: number; target_age: number;
          inflation: number; flexible: boolean; archived_at: string | null;
        };
        Insert: { user_id: string; kind: string; name: string; amount_today: number; target_age: number }
          & Partial<Database['public']['Tables']['goals']['Row']>;
        Update: Partial<Database['public']['Tables']['goals']['Row']>;
        Relationships: [];
      };
      instruments: {
        Row: {
          id: string; user_id: string; key: string; label: string;
          archetype: 'growth' | 'balanced' | 'deposit' | 'locked_deferred' | 'locked_free' | 'cash';
          rate_kind: 'contractual' | 'assumed'; rate: number; rate_source: string;
          locked_until_age: number | null; maturity_year: number | null; compounding: number;
        };
        Insert: { user_id: string; key: string; label: string; archetype: string; rate_kind: string; rate: number }
          & Partial<Database['public']['Tables']['instruments']['Row']>;
        Update: Partial<Database['public']['Tables']['instruments']['Row']>;
        Relationships: [];
      };
      rate_history: {
        Row: {
          id: string; user_id: string; instrument_key: string; rate: number;
          effective_from: string; effective_to: string | null; note: string | null; created_at: string;
        };
        Insert: { user_id: string; instrument_key: string; rate: number; effective_from: string }
          & Partial<Database['public']['Tables']['rate_history']['Row']>;
        Update: Partial<Database['public']['Tables']['rate_history']['Row']>;
        Relationships: [];
      };
      holdings: {
        Row: Stamped & {
          id: string; user_id: string; instrument_key: string; label: string;
          invested: number; current_value: number;
          principal: number | null; booked_rate: number | null;
          start_date: string | null; maturity_date: string | null;
          auto_renew: boolean | null; matured_at: string | null; redeployed_entry_id: string | null;
          source: 'manual' | 'broker_sync' | 'import'; last_synced_at: string | null;
        };
        Insert: { user_id: string; instrument_key: string; label: string }
          & Partial<Database['public']['Tables']['holdings']['Row']>;
        Update: Partial<Database['public']['Tables']['holdings']['Row']>;
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          id: string; user_id: string; entry_date: string; fy_year: number; month_index: number;
          type: 'contribution' | 'withdrawal' | 'transfer' | 'rate_change' | 'correction';
          instrument_key: string; label: string; amount: number; goal_id: string | null;
          transfer_to_instrument: string | null; amends_entry_id: string | null;
          source_holding_id: string | null; note: string | null; created_at: string;
        };
        Insert: {
          user_id: string; entry_date: string; type: string;
          instrument_key: string; label: string; amount: number;
        } & Partial<Omit<Database['public']['Tables']['ledger_entries']['Row'], 'fy_year' | 'month_index'>>;
        Update: Partial<Database['public']['Tables']['ledger_entries']['Row']>;
        Relationships: [];
      };
      month_status: {
        Row: {
          id: string; user_id: string; fy_year: number; month_index: number;
          planned: number; actual: number; confirmed_at: string | null;
        };
        Insert: { user_id: string; fy_year: number; month_index: number }
          & Partial<Database['public']['Tables']['month_status']['Row']>;
        Update: Partial<Database['public']['Tables']['month_status']['Row']>;
        Relationships: [];
      };
      monthly_rollup: {
        Row: {
          id: string; user_id: string; fy_year: number; month_index: number;
          by_instrument: Json; total_contributed: number; total_withdrawn: number;
          net_worth_snapshot: number | null; updated_at: string;
        };
        Insert: { user_id: string; fy_year: number; month_index: number }
          & Partial<Database['public']['Tables']['monthly_rollup']['Row']>;
        Update: Partial<Database['public']['Tables']['monthly_rollup']['Row']>;
        Relationships: [];
      };
      plan_snapshots: {
        Row: {
          id: string; user_id: string; taken_on: string;
          projected_retirement_age: number | null; corpus_at_retirement: number | null;
          corpus_required: number | null; blended_return: number | null;
          rule_pack_version: string | null; assumptions: Json; created_at: string;
        };
        Insert: { user_id: string; taken_on: string }
          & Partial<Database['public']['Tables']['plan_snapshots']['Row']>;
        Update: Partial<Database['public']['Tables']['plan_snapshots']['Row']>;
        Relationships: [];
      };
      allocations: {
        Row: {
          id: string; user_id: string; instrument_key: string;
          monthly_amount: number; is_override: boolean; updated_at: string;
        };
        Insert: { user_id: string; instrument_key: string }
          & Partial<Database['public']['Tables']['allocations']['Row']>;
        Update: Partial<Database['public']['Tables']['allocations']['Row']>;
        Relationships: [];
      };
      broker_connections: {
        Row: {
          id: string; provider: string; access_token: string | null;
          token_expires_at: string | null; last_synced_at: string | null;
          last_sync_summary: Json | null; created_at: string;
        };
        Insert: { id: string } & Partial<Database['public']['Tables']['broker_connections']['Row']>;
        Update: Partial<Database['public']['Tables']['broker_connections']['Row']>;
        Relationships: [];
      };
      rule_packs: {
        Row: {
          id: string; jurisdiction: string; financial_year: string;
          effective_from: string; effective_to: string; published_on: string;
          known_from: string; payload: Json;
        };
        Insert: {
          jurisdiction: string; financial_year: string; effective_from: string;
          effective_to: string; published_on: string; payload: Json;
        } & Partial<Database['public']['Tables']['rule_packs']['Row']>;
        Update: Partial<Database['public']['Tables']['rule_packs']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
