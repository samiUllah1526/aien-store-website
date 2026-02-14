/**
 * Supported product currencies. Used for validation in product DTOs.
 */
export const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'PKR';
