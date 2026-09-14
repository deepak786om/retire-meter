import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { NavRail } from '@/components/NavRail';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('display_name,current_age,jurisdiction')
    .eq('id', user!.id).single();

  return (
    <div className="min-h-screen">
      <NavRail
        name={profile?.display_name ?? 'You'}
        subtitle={`Age ${profile?.current_age ?? '—'} · ${profile?.jurisdiction ?? 'IN'}`}
      />
      <main className="pb-28 md:ml-[250px] md:px-8 md:pb-32 md:pt-7">
        <div className="mx-auto max-w-[1280px] px-4 md:px-0">{children}</div>
      </main>
      <Link
        href="/app/log/new"
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2.5 rounded-[18px] bg-tertiary px-5 py-4 font-bold text-white shadow-e3 transition hover:-translate-y-0.5 hover:shadow-e5 md:bottom-7 md:right-7"
      >
        ＋ Log investment
      </Link>
    </div>
  );
}
