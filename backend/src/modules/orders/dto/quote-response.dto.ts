/**
 * Server-computed quote. All amounts from DB; no client-supplied prices.
 */
export interface QuoteLineItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitCents: number;
  lineTotalCents: number;
}

export interface QuoteResponseDto {
  items: QuoteLineItemDto[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
}
