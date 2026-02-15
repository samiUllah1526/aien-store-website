import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ordersApi, type OrderDto } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function OrdersListPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoggedIn) {
      window.location.href = '/login?returnTo=' + encodeURIComponent('/account/orders');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    ordersApi
      .myOrders({ page, limit })
      .then((res) => {
        if (!cancelled && res?.data) {
          setOrders(res.data);
          setTotal(res.meta?.total ?? res.data.length);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, page]);

  if (!isLoggedIn || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-charcoal/70 dark:text-cream/70">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-sand dark:border-charcoal-light bg-cream/50 dark:bg-ink/30 p-12 text-center">
        <p className="text-charcoal dark:text-cream/90 font-medium">No orders yet</p>
        <p className="mt-1 text-sm text-charcoal/70 dark:text-cream/70">
          When you place an order, it will show up here.
        </p>
        <a
          href="/shop"
          className="mt-6 inline-block rounded-lg bg-ink dark:bg-cream px-5 py-2.5 text-cream dark:text-ink font-medium hover:opacity-90 transition-opacity"
        >
          Browse shop
        </a>
      </div>
    );
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-sand dark:border-charcoal-light bg-white dark:bg-charcoal/30 shadow-soft">
        <ul className="divide-y divide-sand dark:divide-charcoal-light">
          {orders.map((order) => (
            <li key={order.id}>
              <a
                href={`/account/orders/${order.id}`}
                className="block p-4 sm:p-5 hover:bg-sand/30 dark:hover:bg-charcoal-light/20 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm text-charcoal/70 dark:text-cream/70">
                      {order.id.slice(0, 8)}…
                    </span>
                    <span className="ml-2 text-charcoal dark:text-cream font-medium">
                      {formatMoney(order.totalCents, order.currency)}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                <p className="mt-1 text-sm text-charcoal/70 dark:text-cream/70">
                  {formatDate(order.createdAt)} · {order.items.length} item
                  {order.items.length !== 1 ? 's' : ''}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-sand dark:border-charcoal-light px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center px-3 text-sm text-charcoal/70 dark:text-cream/70">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-sand dark:border-charcoal-light px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
