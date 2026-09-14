import type { Metadata } from 'next';
import { Wizard } from '@/components/Wizard';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

export const metadata: Metadata = {
  title: 'Build my plan — RetireMeter',
  description:
    'Free goal-based retirement planner, calibrated for India. No signup, nothing stored, no products sold.',
};

export default function PlanPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-gradient-to-b from-[#F3ECFF] via-[#FDF2F7] to-surface">
        <Wizard />
      </main>
      <SiteFooter />
    </>
  );
}
