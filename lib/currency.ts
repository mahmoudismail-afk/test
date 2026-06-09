/**
 * Currency utilities for USD ↔ LBP conversion.
 * All amounts are stored in USD in the database.
 * LBP values are always computed on the client side.
 */

export const DEFAULT_LBP_RATE = 89500; // 1 USD = 89,500 LBP (default fallback)

export type Currency = 'USD' | 'LBP';

/** Format a number as USD */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a number as LBP — always rounded to the nearest 1,000 */
export function formatLBP(amount: number): string {
  const rounded = Math.round(amount / 1000) * 1000;
  return (
    'ل.ل ' +
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rounded)
  );
}

/** Convert USD to LBP */
export function usdToLbp(usd: number, rate: number): number {
  return usd * rate;
}

/** Convert LBP to USD.
 *  Snaps the LBP input to the nearest 1,000 first so round-trips are lossless.
 */
export function lbpToUsd(lbp: number, rate: number): number {
  if (rate <= 0) return 0;
  const snapped = Math.round(lbp / 1000) * 1000; // nearest 1,000 LBP
  return Math.round((snapped / rate) * 10_000) / 10_000; // 4dp USD
}

/** Format in any currency */
export function formatCurrencyAuto(
  amountUsd: number,
  currency: Currency,
  rate: number
): string {
  if (currency === 'LBP') {
    return formatLBP(usdToLbp(amountUsd, rate));
  }
  return formatUSD(amountUsd);
}
