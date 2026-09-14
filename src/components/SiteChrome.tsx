import Link from 'next/link';

/** Shared header + footer so every marketing route looks the same. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink-line bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Mark />
          <span className="text-left">
            <span className="block text-[19px] font-extrabold tracking-[-.035em]">
              Retire<span className="text-primary">Meter</span>
            </span>
            <span className="block text-[10.5px] font-medium text-ink-variant">
              Plan · Invest · Track · Retire better
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/learn/how-it-works" className="m3-btn-text hidden sm:inline-flex">How it works</Link>
          <Link href="/plan" className="m3-btn-text hidden sm:inline-flex">Calculators</Link>
          <Link href="/login" className="m3-btn-text">Log in</Link>
          <Link href="/login?mode=signup" className="m3-btn-filled !px-5 !py-2.5">Sign up free</Link>
        </nav>
      </div>
    </header>
  );
}

export function Mark() {
  return (
    <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden>
      <path d="M20 5a15 15 0 0 1 13.3 8" stroke="#4B21C4" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M33.3 13A15 15 0 0 1 20 35" stroke="#6C3BF5" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M20 35A15 15 0 0 1 20 5" stroke="#A346F0" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M20 22 30 13" stroke="#1C1B22" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="28" r="4.6" fill="#FF3D8A" /><circle cx="20" cy="22" r="2.6" fill="#1C1B22" />
    </svg>
  );
}

const FOOTER = {
  Product: [['How it works', '/learn/how-it-works'], ['Calculators', '/plan'],
            ['Assumptions we use', '/learn/assumptions'], ['Why 3.25%, not 4%', '/learn/safe-withdrawal-rate']],
  Learn: [['Goal-based planning', '/learn/goal-based-planning'], ['EPF, PPF & NPS', '/learn/epf-ppf-nps'],
          ['Withdrawal sequencing', '/learn/withdrawal-sequencing'], ['Health cover at 45', '/learn/health-cover']],
  Legal: [['Privacy policy', '/legal/privacy'], ['Terms of use', '/legal/terms'],
          ['Data & DPDP', '/legal/dpdp'], ['Contact', '/legal/contact']],
} as const;

export function SiteFooter() {
  return (
    <footer className="mt-14 bg-[#17131F] py-12 text-[#CFC6DE]">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <p className="text-[19px] font-extrabold tracking-[-.035em] text-white">
            Retire<span className="text-[#B08BFF]">Meter</span>
          </p>
          <p className="mb-3 mt-0.5 text-[10.5px] text-[#8A7FA0]">Plan · Invest · Track · Retire better</p>
          <p className="max-w-[34ch] text-[13px] leading-relaxed text-[#8A7FA0]">
            A planning and tracking tool for people who want to know the real number, not a comfortable one.
          </p>
        </div>
        {Object.entries(FOOTER).map(([heading, links]) => (
          <div key={heading}>
            <h2 className="mb-3 text-[13px] font-bold text-white">{heading}</h2>
            {links.map(([label, href]) => (
              <Link key={href} href={href}
                    className="block py-1.5 text-[13.5px] text-[#A79CBC] transition hover:text-[#D6BBFF]">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-[1180px] border-t border-[#2E2739] px-6 pt-6 text-xs leading-relaxed text-[#8A7FA0]">
        RetireMeter is a calculator and personal tracking tool. It is not a SEBI-registered investment
        adviser, does not provide investment advice, and does not recommend or distribute any financial
        product. All projections are illustrations based on assumptions you control. Past returns do not
        indicate future results.
      </p>
    </footer>
  );
}
