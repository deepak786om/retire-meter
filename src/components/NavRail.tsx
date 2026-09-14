'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const ITEMS = [
  { href: '/app', label: 'Meter', icon: 'M4 18a8 8 0 1 1 16 0M12 14l4.5-4.5' },
  { href: '/app/plan', label: 'Plan', icon: 'M3 17l5-6 4 4 5-8 4 6M3 21h18' },
  { href: '/app/log', label: 'Log', icon: 'M8 10h8M8 14h5' },
  { href: '/app/portfolio', label: 'Portfolio', icon: 'M8 7V5.5A1.5 1.5 0 019.5 4h5A1.5 1.5 0 0116 5.5V7' },
  { href: '/app/later', label: 'Later', icon: 'M3 15h18' },
];

export function NavRail({ name, subtitle }: { name: string; subtitle: string }) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/app' ? path === '/app' : path.startsWith(href));

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[250px] flex-col bg-surface-1 p-3 md:flex">
        <Link href="/app" className="flex items-center gap-3 px-2.5 pb-5 pt-1">
          <span className="text-[17px] font-extrabold tracking-[-.035em]">
            Retire<span className="text-primary">Meter</span>
          </span>
        </Link>
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="relative">
            {isActive(item.href) && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-primary-container"
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
            <span className={`relative flex items-center gap-3 rounded-full px-4 py-3.5 text-sm font-semibold transition ${
              isActive(item.href) ? 'text-primary-on' : 'text-ink-variant hover:bg-surface-3'
            }`}>
              <Icon d={item.icon} />
              {item.label}
            </span>
          </Link>
        ))}
        <div className="mt-auto border-t border-ink-line pt-3">
          <Link href="/app/assumptions" className="flex items-center gap-3 rounded-full px-4 py-3.5 text-sm font-semibold text-ink-variant hover:bg-surface-3">
            <Icon d="M12 2v3M12 19v3M2 12h3M19 12h3" /> Assumptions
          </Link>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-tertiary text-[13px] font-bold text-white">
              {name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <span className="block text-[13.5px] font-bold">{name}</span>
              <span className="block text-[11px] text-ink-variant">{subtitle}</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 bg-surface-2 px-1 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden">
        <ul className="flex">
          {ITEMS.map((item) => (
            <li key={item.href} className="flex-1">
              <Link href={item.href} className={`flex flex-col items-center gap-1 py-1.5 text-[10.5px] font-bold ${
                isActive(item.href) ? 'text-primary-on' : 'text-ink-variant'
              }`}>
                <span className={`rounded-full px-3.5 py-1 transition ${isActive(item.href) ? 'bg-primary-container' : ''}`}>
                  <Icon d={item.icon} />
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
         strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
