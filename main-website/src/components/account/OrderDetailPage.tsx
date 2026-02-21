import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ordersApi, type OrderDto } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';
import { getApiBaseUrl } from '../../lib/api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getOrderIdFromUrl(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

export default function OrderDetailPage({ orderId: propOrderId }: { orderId: string }) {
  const orderId = (propOrderId && propOrderId.trim()) || getOrderIdFromUrl();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = (propOrderId && propOrderId.trim()) || getOrderIdFromUrl();
    if (!id) {
      setLoading(false);
      setError('Order ID required');
      return;
    }
    if (!isLoggedIn) {
      window.location.href = '/login?returnTo=' + encodeURIComponent(`/account/orders/order?id=${id}`);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    ordersApi
      .myOrder(id)
      .then((res) => {
        if (!cancelled && res?.data) setOrder(res.data as OrderDto);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Order not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, propOrderId]);

  if (!isLoggedIn || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-charcoal/70 dark:text-cream/70">Loading…</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300 text-sm">
        {error ?? 'Order not found'}
      </div>
    );
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const imageUrl = (path: string | null | undefined) =>
    path && (path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-mono text-sm text-charcoal/70 dark:text-cream/70">Order {order.id}</h2>
          <p className="mt-0.5 text-sm text-charcoal/70 dark:text-cream/70">
            Placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            order.status === 'DELIVERED'
              ? 'bg-emerald/20 text-emerald'
              : order.status === 'CANCELLED'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
          }`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="rounded-xl border border-sand dark:border-charcoal-light bg-white dark:bg-charcoal/30 overflow-hidden shadow-soft">
        <h3 className="px-4 py-3 border-b border-sand dark:border-charcoal-light font-medium text-ink dark:text-cream">
          Items
        </h3>
        <ul className="divide-y divide-sand dark:divide-charcoal-light">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 p-4">
              {item.productImage && (
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sand/50 dark:bg-charcoal-light/50">
                  <img
                    src={imageUrl(item.productImage)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink dark:text-cream">
                  {item.productName ?? 'Product'}
                </p>
                <p className="text-sm text-charcoal/70 dark:text-cream/70">
                  Qty {item.quantity} × {formatMoney(item.unitCents, order.currency)}
                </p>
              </div>
              <p className="shrink-0 font-medium text-ink dark:text-cream">
                {formatMoney(item.quantity * item.unitCents, order.currency)}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-sand dark:border-charcoal-light px-4 py-3 space-y-1.5 text-sm">
          {(() => {
            const subtotal = order.subtotalCents ?? order.items.reduce((s, i) => s + (i.unitCents ?? 0) * i.quantity, 0);
            const shipping = order.shippingCents ?? 0;
            const discount = order.discountCents ?? 0;
            return (
              <>
                <div className="flex justify-between text-charcoal dark:text-cream/90">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal, order.currency)}</span>
                </div>
                {shipping > 0 && (
                  <div className="flex justify-between text-charcoal dark:text-cream/90">
                    <span>Shipping</span>
                    <span>{formatMoney(shipping, order.currency)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
                    <span>-{formatMoney(discount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-ink dark:text-cream pt-1">
                  <span>Total</span>
                  <span>{formatMoney(order.totalCents, order.currency)}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="rounded-xl border border-sand dark:border-charcoal-light bg-white dark:bg-charcoal/30 overflow-hidden shadow-soft">
          <h3 className="px-4 py-3 border-b border-sand dark:border-charcoal-light font-medium text-ink dark:text-cream">
            Status history
          </h3>
          <ul className="divide-y divide-sand dark:divide-charcoal-light">
            {order.statusHistory.map((entry, i) => (
              <li key={i} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                <span className="font-medium">
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </span>
                <span className="text-charcoal/70 dark:text-cream/70">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(order.shippingAddressLine1 || order.shippingCity) && (
        <div className="rounded-xl border border-sand dark:border-charcoal-light bg-white dark:bg-charcoal/30 p-4 shadow-soft">
          <h3 className="font-medium text-ink dark:text-cream mb-2">Shipping address</h3>
          <p className="text-sm text-charcoal dark:text-cream/90 whitespace-pre-line">
            {order.customerName && `${order.customerName}\n`}
            {order.shippingAddressLine1}
            {order.shippingAddressLine2 && `\n${order.shippingAddressLine2}`}
            {order.shippingCity && `\n${order.shippingCity}`}
            {order.shippingPostalCode && ` ${order.shippingPostalCode}`}
            {order.shippingCountry && `\n${order.shippingCountry}`}
          </p>
        </div>
      )}

      {(order.courierServiceName || order.trackingId) && (
        <div className="rounded-xl border border-sand dark:border-charcoal-light bg-white dark:bg-charcoal/30 p-4 shadow-soft">
          <h3 className="font-medium text-ink dark:text-cream mb-2">Shipping & tracking</h3>
          <dl className="space-y-1 text-sm">
            {order.courierServiceName && (
              <div>
                <dt className="text-charcoal/70 dark:text-cream/70">Courier</dt>
                <dd className="font-medium text-ink dark:text-cream">{order.courierServiceName}</dd>
              </div>
            )}
            {order.trackingId && (
              <div>
                <dt className="text-charcoal/70 dark:text-cream/70">Tracking ID</dt>
                <dd className="font-medium text-ink dark:text-cream font-mono">{order.trackingId}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <a
        href="/account/orders"
        className="inline-block text-sm font-medium text-emerald hover:underline"
      >
        ← Back to orders
      </a>
    </div>
  );
}
