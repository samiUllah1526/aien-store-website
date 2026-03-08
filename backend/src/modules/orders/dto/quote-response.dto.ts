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
  unitCents: number;
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
