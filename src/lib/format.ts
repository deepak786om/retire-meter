/** Indian numbering. Lakh/crore is a formatting concern, not a maths one — the
 *  engine works in plain numbers and only the display layer knows about crores. */
export function inr(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(1).replace(/\.0$/, '')} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const pct = (n: number, dp = 2) => `${(n * 100).toFixed(dp)}%`;

export const FY_MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'] as const;

/** India's financial year starts in April; the rule pack carries fyStartMonth. */
export function fyBucket(date: Date, fyStartMonth = 4) {
  const m = date.getMonth() + 1;
  return m >= fyStartMonth
    ? { fyYear: date.getFullYear(), monthIndex: m - fyStartMonth }
    : { fyYear: date.getFullYear() - 1, monthIndex: m + (12 - fyStartMonth) };
}

export const fyLabel = (fyYear: number) => `FY ${fyYear}-${String((fyYear + 1) % 100).padStart(2, '0')}`;
