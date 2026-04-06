import { SalesCampaignType } from '@prisma/client';

export interface SalePriceInfo {
  campaignId: string;
  campaignName: string;
  type: SalesCampaignType;
  /** Effective discount value (may be per-product override). */
  discountValue: number;
  badgeText: string | null;
  endsAt: Date;
  priority: number;
}

/**
 * Pure function: compute sale price from base price and campaign info.
 * Shared between ProductsService and OrdersService.
 */
export function computeSalePrice(
  baseCents: number,
  info: SalePriceInfo,
): number {
  if (info.type === SalesCampaignType.PERCENTAGE) {
    return Math.max(
      0,
      baseCents - Math.round((baseCents * info.discountValue) / 100),
    );
  }
  return Math.max(0, baseCents - info.discountValue);
}
