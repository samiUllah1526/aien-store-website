/**
 * Normalize store API price fields into a display-ready pair.
 *
 * Backend campaigns expose `salePrice` / `originalPrice`; older payloads may
 * still send `compareAtPrice`. Effective shelf price prefers the sale amount.
 */

export type StorePriceInput = {
  price: number;
  salePrice?: number | null;
  originalPrice?: number | null;
  compareAtPrice?: number | null;
  saleBadgeText?: string | null;
  onSale?: boolean;
};

export type ResolvedStorePrice = {
  /** Amount the shopper pays (cents). */
  price: number;
  /** Struck-through compare-at when higher than `price`; otherwise null. */
  compareAtPrice: number | null;
  onSale: boolean;
  saleBadgeText: string | null;
};

function asFiniteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function resolveStorePrice(input: StorePriceInput): ResolvedStorePrice {
  const base = asFiniteNumber(input.price) ?? 0;
  const salePrice = asFiniteNumber(input.salePrice);
  const originalPrice = asFiniteNumber(input.originalPrice);
  const legacyCompareAt = asFiniteNumber(input.compareAtPrice);

  const price = salePrice ?? base;
  const rawCompareAt = originalPrice ?? legacyCompareAt;
  const compareAtPrice =
    rawCompareAt != null && rawCompareAt > price ? rawCompareAt : null;
  const onSale = Boolean(input.onSale) || compareAtPrice != null;

  return {
    price,
    compareAtPrice,
    onSale,
    saleBadgeText: input.saleBadgeText?.trim() || null,
  };
}
