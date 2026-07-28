/**
 * Mirror of backend `computeSalePrice` for storefront display.
 * Keep in sync with `backend/src/modules/sales-campaigns/sale-price.util.ts`.
 */

export type StoreSaleType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export type StoreSaleInfo = {
  type: StoreSaleType;
  discountValue: number;
};

export function computeStoreSalePrice(
  baseCents: number,
  sale: StoreSaleInfo | null | undefined,
): number {
  if (!sale || !Number.isFinite(baseCents)) return Math.max(0, baseCents || 0);
  if (sale.type === 'PERCENTAGE') {
    return Math.max(
      0,
      baseCents - Math.round((baseCents * sale.discountValue) / 100),
    );
  }
  return Math.max(0, baseCents - sale.discountValue);
}

/**
 * Resolve the payable unit + compare-at for a product/variant unit price.
 */
export function resolveUnitSaleDisplay(
  listUnitCents: number,
  sale: StoreSaleInfo | null | undefined,
): { price: number; compareAtPrice: number | null } {
  if (!sale) {
    return { price: listUnitCents, compareAtPrice: null };
  }
  const price = computeStoreSalePrice(listUnitCents, sale);
  const compareAtPrice = listUnitCents > price ? listUnitCents : null;
  return { price, compareAtPrice };
}
