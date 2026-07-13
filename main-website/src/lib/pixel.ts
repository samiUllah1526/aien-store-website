/**
 * Meta Pixel (fbq) helpers for the storefront.
 *
 * Safe no-op when the pixel is not loaded (marketing disabled / SSR).
 * Tracking failures never throw — cart and checkout must keep working.
 *
 * Values are stored in cents throughout the app; Meta expects major units.
 * Every event carries an eventID so Conversions API can dedupe later.
 */

export type PixelEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase';

export type PixelContent = {
  id: string;
  quantity: number;
  item_price?: number;
};

export type PixelPayload = {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: 'product' | 'product_group';
  content_name?: string;
  contents?: PixelContent[];
  num_items?: number;
};

export type TrackPixelOptions = {
  /** Deduplication id — use orderId for Purchase when available. */
  eventID?: string;
};

type FbqFn = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

/** Convert minor units (cents/paisa) to major currency units for Meta. */
export function centsToValue(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

export function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Map cart-like line items into Meta `contents` + aggregate helpers. */
export function cartItemsToPixelFields(
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    currency?: string;
  }>,
): Pick<PixelPayload, 'content_ids' | 'contents' | 'num_items' | 'value' | 'currency' | 'content_type'> {
  const contents: PixelContent[] = items.map((item) => ({
    id: item.productId,
    quantity: item.quantity,
    item_price: centsToValue(item.price),
  }));
  const content_ids = [...new Set(items.map((item) => item.productId))];
  const num_items = items.reduce((sum, item) => sum + item.quantity, 0);
  const value = centsToValue(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const currency = items[0]?.currency || 'PKR';
  return {
    content_type: 'product',
    content_ids,
    contents,
    num_items,
    value,
    currency,
  };
}

/**
 * Fire a Meta standard event. Never throws; no-ops when fbq is unavailable.
 */
export function trackPixel(
  event: PixelEventName,
  payload?: PixelPayload,
  options?: TrackPixelOptions,
): void {
  if (typeof window === 'undefined') return;
  const fbq = window.fbq;
  if (typeof fbq !== 'function') return;

  try {
    const eventID = options?.eventID ?? newEventId();
    if (payload && Object.keys(payload).length > 0) {
      fbq('track', event, payload, { eventID });
    } else {
      fbq('track', event, {}, { eventID });
    }
  } catch {
    // Tracking must never break the storefront.
  }
}
