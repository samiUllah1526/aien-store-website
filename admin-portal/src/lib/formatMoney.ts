/**
 * Format an amount stored in minor units (cents/paisa) for display in major units (PKR).
 * Uses Intl.NumberFormat for locale-aware currency display.
 * @param cents - Amount in minor units (e.g. paisa for PKR: 5000 = Rs 50.00)
 * @param currency - ISO 4217 currency code, defaults to PKR
 */
export function formatMoney(cents: number, currency: string = 'PKR'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
