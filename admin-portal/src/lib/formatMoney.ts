/**
 * Format an amount stored in minor units (cents) with the given currency.
 * Uses Intl.NumberFormat for locale-aware currency display.
 */
export function formatMoney(cents: number, currency: string = 'PKR'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
