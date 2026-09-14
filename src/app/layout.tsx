import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'RetireMeter — plan, invest, track, retire better',
  description:
    'Goal-based retirement planning and tracking, calibrated for India. Free calculators, no products sold, nothing stored.',
  openGraph: { title: 'RetireMeter', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#6C3BF5', width: 'device-width', initialScale: 1 };

/**
 * Fonts are loaded via <link> rather than next/font so the build never depends on
 * outbound network access. Swap to next/font/google in a build environment that
 * allows fonts.googleapis.com — it self-hosts and removes the extra round trip.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
