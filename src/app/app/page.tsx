import { createClient } from '@/lib/supabase/server';
import { MeterView } from '@/components/MeterView';
import { loadPlanInput } from '@/lib/loadPlan';

/** Server component: load state, solve on the server, hand a plain object to the client. */
export default async function MeterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { input, months } = await loadPlanInput(supabase, user!.id);
  return <MeterView input={input} months={months} />;
}
