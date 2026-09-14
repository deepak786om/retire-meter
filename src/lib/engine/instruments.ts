/**
 * Instrument-level maths. Every function here is pure and must be exactly right —
 * if the app disagrees with the user's bank statement, the app loses.
 */

/** Compound a principal at an annual nominal rate with n periods per year. */
export function compound(
  principal: number,
  annualRate: number,
  years: number,
  periodsPerYear = 4
): number {
  if (years <= 0) return principal;
  return principal * Math.pow(1 + annualRate / periodsPerYear, periodsPerYear * years);
}

/**
 * Fixed deposit maturity. Indian FDs compound QUARTERLY by default, which is why
 * a naive simple-interest number is always slightly low.
 * ₹1,00,000 @ 6% for 1yr → ₹1,06,136.36, not ₹1,06,000.
 */
export function fdMaturity(
  principal: number,
  annualRate: number,
  years: number,
  compounding: 1 | 2 | 4 | 12 = 4
): number {
  return compound(principal, annualRate, years, compounding);
}

/**
 * Premature FD closure. Banks do TWO things, and most tools model only the first:
 *   1. re-rate to the card rate applicable to the period ACTUALLY held
 *   2. subtract a penalty from that re-rated figure
 * Applying the penalty to the contracted rate overstates the payout.
 */
export function fdPrematureValue(
  principal: number,
  cardRateForHeldPeriod: number,
  penalty: number,
  yearsHeld: number,
  compounding: 1 | 2 | 4 | 12 = 4
): number {
  const applicable = Math.max(0, cardRateForHeldPeriod - penalty);
  return compound(principal, applicable, yearsHeld, compounding);
}

/**
 * PPF interest for one month. The statutory convention is the LOWEST balance
 * between the 5th and the last day of the month — contribute on the 6th and you
 * forfeit a month of interest on that money.
 */
export function ppfMonthlyInterest(
  openingBalance: number,
  contribution: number,
  dayOfContribution: number,
  annualRate: number
): number {
  const qualifying = dayOfContribution <= 5
    ? openingBalance + contribution
    : openingBalance;
  return (qualifying * annualRate) / 12;
}

/** Full-year PPF with a monthly contribution on a fixed day. Credited at year end. */
export function ppfYear(
  openingBalance: number,
  monthlyContribution: number,
  dayOfContribution: number,
  annualRate: number
): { closing: number; interest: number } {
  let balance = openingBalance;
  let interest = 0;
  for (let m = 0; m < 12; m++) {
    interest += ppfMonthlyInterest(balance, monthlyContribution, dayOfContribution, annualRate);
    balance += monthlyContribution;
  }
  return { closing: balance + interest, interest };
}

/** Monthly contribution needed to reach a future value. Standard annuity-due-less form. */
export function sipForTarget(
  futureValue: number,
  years: number,
  annualRate: number
): number {
  const n = years * 12;
  if (n <= 0) return futureValue;
  const i = annualRate / 12;
  if (i === 0) return futureValue / n;
  return (futureValue * i) / (Math.pow(1 + i, n) - 1);
}

/** Future value of a monthly SIP. */
export function sipFutureValue(
  monthly: number,
  years: number,
  annualRate: number
): number {
  const n = years * 12;
  const i = annualRate / 12;
  if (i === 0) return monthly * n;
  return monthly * ((Math.pow(1 + i, n) - 1) / i);
}

/** Inflate a present-day amount forward. */
export function inflate(amountToday: number, rate: number, years: number): number {
  return amountToday * Math.pow(1 + rate, years);
}

/**
 * The self-healing top-up.
 *
 * A shortfall discovered today (a low FD rate, a missed month) is worth its
 * compounded value at retirement. To repair it you do NOT need the raw shortfall:
 * you need its present value at the return of whatever you correct INTO, because
 * money injected today compounds for one extra year.
 *
 *   ₹2,000 of lost FD interest, repaired into equity at 11% → ₹1,802 today.
 *
 * Acting late costs more, which is exactly the incentive we want.
 */
export function repairAmount(
  shortfallAtRealisation: number,
  correctionRate: number,
  yearsUntilRealisation = 1
): number {
  return shortfallAtRealisation / Math.pow(1 + correctionRate, yearsUntilRealisation);
}

/** What a shortfall today costs at retirement — the number that changes behaviour. */
export function corpusImpact(
  shortfallToday: number,
  blendedReturn: number,
  yearsToRetirement: number
): number {
  return shortfallToday * Math.pow(1 + blendedReturn, yearsToRetirement);
}

/**
 * Blended portfolio return, weighted by where money actually goes.
 * Recomputed on every allocation change — this is why booking an FD 1% lower
 * silently raises your required monthly contribution.
 */
export function blendedReturn(
  allocation: Record<string, number>,
  rates: Record<string, number>
): number {
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  return Object.entries(allocation).reduce(
    (acc, [key, amt]) => acc + (amt / total) * (rates[key] ?? 0),
    0
  );
}
