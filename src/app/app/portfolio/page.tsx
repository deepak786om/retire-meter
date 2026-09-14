import { createClient } from '@/lib/supabase/server';
import { loadPlanInput } from '@/lib/loadPlan';
import { AppSection } from '@/components/AppSection';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { input, months } = await loadPlanInput(supabase, user!.id);
  return <AppSection section="portfolio" input={input} months={months} />;
}
