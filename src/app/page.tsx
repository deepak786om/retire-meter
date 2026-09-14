import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

/** Marketing landing. Server-rendered — no client JS needed to read it. */
export default function Home() {
  return (
    <>
      <SiteHeader />

      <main className="relative overflow-hidden bg-gradient-to-b from-[#F3ECFF] via-[#FDF2F7] to-surface">
        <Blobs />
        <div className="relative mx-auto max-w-[1180px] px-6">
          <section className="py-16 text-center md:py-24">
            <h1 className="mx-auto max-w-[16ch] text-[33px] font-bold leading-[1.05] tracking-[-.042em] md:text-[52px]">
              Know exactly{' '}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">when</span>
              <br />you can stop working.
            </h1>
            <p className="mx-auto mt-4 max-w-[48ch] text-[17px] text-ink-variant">
              Every milestone you want, every rupee you hold, and the one number that matters.
              Free, nothing stored, no products sold.
            </p>
            <Link href="/plan" className="m3-btn-filled mt-7 !px-8 !py-4 !text-base">
              Build my plan — 2 minutes
            </Link>
            <ul className="mt-7 flex flex-wrap justify-center gap-7 text-[13px] font-semibold text-ink-variant">
              <li>⚡ No signup</li><li>🔒 Nothing stored</li><li>📊 India-calibrated</li>
            </ul>
          </section>

          <section className="m3-card-elevated mb-12 !rounded-xl3 !p-7">
            <h2 className="mb-4 text-xl font-bold">What most calculators get wrong</h2>
            <ul className="grid gap-4 md:grid-cols-2">
              {WRONG.map(([title, detail]) => (
                <li key={title} className="flex gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-danger-container text-danger">✕</span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-variant">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

const WRONG: Array<[string, string]> = [
  ['One inflation number', 'Your groceries rise at 6%, school fees at 11%, medical at 13%. One number is wrong for all three.'],
  ['The American 4% rule', 'Built on 2–3% US inflation. India needs closer to 3.25%, which means a corpus about 30% larger.'],
  ['A single life expectancy', 'Planning to 85 when you might reach 95 is the commonest quiet failure.'],
  ['Goals in isolation', 'Your car, house and retirement draw on the same rupees. They have to compete.'],
];


function Blobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-32 h-[460px] w-[460px] rounded-full bg-[#B08BFF] opacity-50 blur-[70px]" />
      <div className="absolute -right-28 top-10 h-[400px] w-[400px] rounded-full bg-[#FF8FBE] opacity-50 blur-[70px]" />
      <div className="absolute left-1/3 top-[340px] h-[340px] w-[340px] rounded-full bg-[#7FE7C4] opacity-50 blur-[70px]" />
    </div>
  );
}


