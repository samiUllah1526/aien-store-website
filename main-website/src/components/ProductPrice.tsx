/**
 * Shared storefront price display.
 *
 * Hierarchy (production recommendation):
 * - detail: product page — largest, high contrast
 * - card:   grids / carousels — clear but secondary to title
 * - line:   cart / checkout line items
 * - compact: search / dense lists
 * - total:  cart / checkout grand totals (serif editorial)
 *
 * Sale styling: current price stays strong; compare-at is smaller, muted,
 * struck through. Accent teal is reserved for sale current prices only.
 */

import { formatMoney } from '../lib/formatMoney';

export type ProductPriceSize = 'compact' | 'card' | 'detail' | 'line' | 'total';

export interface ProductPriceProps {
  amountCents: number;
  currency?: string;
  compareAtCents?: number | null;
  size?: ProductPriceSize;
  className?: string;
  /** Stack compare-at under current (cards) vs inline (detail / line). */
  layout?: 'stack' | 'inline';
  /** Tint the current price teal when a compare-at is showing. Default true. */
  accentOnSale?: boolean;
}

const CURRENT: Record<ProductPriceSize, string> = {
  compact: 'font-sans text-sm font-medium tabular-nums tracking-tight',
  card: 'font-sans text-lg font-medium tabular-nums tracking-tight',
  detail: 'font-sans text-2xl font-medium tabular-nums tracking-tight',
  line: 'font-sans text-base font-medium tabular-nums tracking-tight',
  total: 'font-serif text-h2-editorial tabular-nums tracking-tight leading-none',
};

const COMPARE: Record<ProductPriceSize, string> = {
  compact: 'font-sans text-xs tabular-nums text-on-surface-variant line-through',
  card: 'font-sans text-sm tabular-nums text-on-surface-variant line-through',
  detail: 'font-sans text-base tabular-nums text-on-surface-variant line-through',
  line: 'font-sans text-sm tabular-nums text-on-surface-variant line-through',
  total: 'font-sans text-body-md tabular-nums text-on-surface-variant line-through',
};

export default function ProductPrice({
  amountCents,
  currency = 'PKR',
  compareAtCents = null,
  size = 'card',
  className = '',
  layout,
  accentOnSale = true,
}: ProductPriceProps) {
  const onSale =
    compareAtCents != null && Number.isFinite(compareAtCents) && compareAtCents > amountCents;
  const resolvedLayout = layout ?? (size === 'card' || size === 'compact' ? 'stack' : 'inline');

  const currentColor =
    onSale && accentOnSale ? 'text-secondary' : 'text-on-background';

  const current = (
    <span className={`${CURRENT[size]} ${currentColor}`}>
      {formatMoney(amountCents, currency)}
    </span>
  );

  const compare = onSale ? (
    <span className={COMPARE[size]}>{formatMoney(compareAtCents!, currency)}</span>
  ) : null;

  if (!compare) {
    return <span className={className || undefined}>{current}</span>;
  }

  if (resolvedLayout === 'stack') {
    return (
      <span className={`inline-flex flex-col items-end gap-0.5 ${className}`.trim()}>
        {current}
        {compare}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline gap-3 ${className}`.trim()}>
      {current}
      {compare}
    </span>
  );
}
