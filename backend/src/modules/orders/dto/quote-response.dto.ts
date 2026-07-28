/**
 * Server-computed quote. All amounts from DB; no client-supplied prices.
 */
export interface QuoteLineItemDto {
  productId: string;
  variantId: string;
  productName: string;
  /** Color snapshot when provided in request. */
  color?: string | null;
  /** Size when provided in request (e.g. S, M, L). Optional. */
  size?: string | null;
  quantity: number;
  /** Payable unit price after active sale (if any). */
  unitCents: number;
  /**
   * Pre-sale unit price when a campaign applies; null when not on sale.
   * Used by the storefront for strikethrough compare-at display.
   */
  originalUnitCents: number | null;
  lineTotalCents: number;
}

export interface QuoteResponseDto {
  items: QuoteLineItemDto[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  voucherCode?: string;
}
