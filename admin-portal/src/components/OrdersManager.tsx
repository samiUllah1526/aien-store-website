import { useState, useEffect, useCallback, useRef } from 'react';
import { api, getApiBaseUrl } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { formatDateTime } from '../lib/format';
import { formatMoney } from '../lib/formatMoney';
import { OrderDetailModal } from './OrderDetailModal';
import type { Order, OrderStatus } from '../lib/types';
import { getAllowedNextStatuses, isTerminalStatus } from '../lib/orderStatus';

const PAGE_SIZE = 10;
const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const debouncedOrderId = useDebounce(orderIdSearch.trim(), 400);
  const debouncedEmail = useDebounce(emailSearch.trim(), 400);
  const [totalMinPkr, setTotalMinPkr] = useState('');
  const [totalMaxPkr, setTotalMaxPkr] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const orderRowRef = useRef<HTMLTableRowElement | null>(null);

  function getPaymentProofUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const base = getApiBaseUrl().replace(/\/$/, '');
    return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}media/file/${path}`;
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
      };
      if (statusFilter) params.status = statusFilter;
      if (debouncedOrderId) params.orderId = debouncedOrderId;
      if (debouncedEmail) params.customerEmail = debouncedEmail;
      const totalMin = totalMinPkr.trim() ? Math.round(parseFloat(totalMinPkr) * 100) : undefined;
      const totalMax = totalMaxPkr.trim() ? Math.round(parseFloat(totalMaxPkr) * 100) : undefined;
      if (totalMin != null && !Number.isNaN(totalMin) && totalMin >= 0) params.totalMinCents = totalMin;
      if (totalMax != null && !Number.isNaN(totalMax) && totalMax >= 0) params.totalMaxCents = totalMax;
      if (dateFrom) params.dateFrom = new Date(dateFrom + 'T00:00:00').toISOString();
      if (dateTo) params.dateTo = new Date(dateTo + 'T23:59:59.999').toISOString();
      if (assignedToUserId.trim()) params.assignedToUserId = assignedToUserId.trim();

      const res = await api.getList<Order>('/orders', params);
      setOrders(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedOrderId, debouncedEmail, totalMinPkr, totalMaxPkr, dateFrom, dateTo, assignedToUserId]);

  useEffect(() => {
    setPage(1);
  }, [debouncedOrderId, debouncedEmail]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdateError(null);
    setUpdatingId(orderId);
    try {
      await api.put<Order>(`/orders/${orderId}`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setOrderIdSearch('');
    setEmailSearch('');
    setTotalMinPkr('');
    setTotalMaxPkr('');
    setDateFrom('');
    setDateTo('');
    setAssignedToUserId('');
    setPage(1);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <OrderDetailModal
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={fetchOrders}
        returnFocusRef={orderRowRef}
        getPaymentProofUrl={getPaymentProofUrl}
        onViewPaymentProof={(url) => setProofImageUrl(url)}
      />
      {proofImageUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setProofImageUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Payment proof screenshot"
        >
          <div className="relative max-h-[90vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={proofImageUrl}
              alt="Payment proof"
              className="max-h-[90vh] max-w-full rounded-lg border border-slate-200 bg-white object-contain shadow-xl dark:border-slate-700"
            />
            <button
              type="button"
              onClick={() => setProofImageUrl(null)}
              className="absolute -right-2 -top-2 rounded-full bg-slate-800 p-2 text-white shadow hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Orders</h1>

      {/* Filters */}
      <form onSubmit={handleApplyFilters} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <label htmlFor="orderId" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Order ID
            </label>
            <input
              id="orderId"
              type="text"
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              placeholder="Partial or full UUID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="emailSearch" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Customer email
            </label>
            <input
              id="emailSearch"
              type="text"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              placeholder="Partial match"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="totalMin" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Total min (PKR)
            </label>
            <input
              id="totalMin"
              type="number"
              min={0}
              step={1}
              value={totalMinPkr}
              onChange={(e) => setTotalMinPkr(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="totalMax" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Total max (PKR)
            </label>
            <input
              id="totalMax"
              type="number"
              min={0}
              step={1}
              value={totalMaxPkr}
              onChange={(e) => setTotalMaxPkr(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dateFrom" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              From date
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              To date
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="assignedTo" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Assigned staff (user ID)
            </label>
            <input
              id="assignedTo"
              type="text"
              value={assignedToUserId}
              onChange={(e) => setAssignedToUserId(e.target.value)}
              placeholder="UUID"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Clear all
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      {updateError && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" role="alert">
          {updateError}
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Order</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Products</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Total</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Assigned</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-800 p-12 text-center text-slate-600 dark:text-slate-400">
          No orders match your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Order</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Products</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Total</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Assigned</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {orders.map((order) => (
                  <tr
                    key={order.id}
                    tabIndex={0}
                    role="button"
                    onClick={(e) => {
                      orderRowRef.current = e.currentTarget as HTMLTableRowElement;
                      setSelectedOrderId(order.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        orderRowRef.current = e.currentTarget as HTMLTableRowElement;
                        setSelectedOrderId(order.id);
                      }
                    }}
                    className="cursor-pointer hover:bg-slate-50 dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all" title={order.id}>
                        {order.id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{order.customerEmail}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      <ul className="space-y-2">
                        {order.items.map((item) => {
                          const imgSrc = item.productImage
                            ? `${getApiBaseUrl().replace(/\/$/, '')}${item.productImage.startsWith('/') ? '' : '/'}${item.productImage}`
                            : null;
                          return (
                            <li key={item.id} className="flex items-center gap-2">
                              {imgSrc && (
                                <img
                                  src={imgSrc}
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded object-cover bg-slate-100 dark:bg-slate-700"
                                />
                              )}
                              <span>
                                {item.productName ?? item.productId} × {item.quantity}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatMoney(order.totalCents, order.currency ?? 'PKR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300" onClick={(e) => e.stopPropagation()}>
                      {order.paymentMethod === 'BANK_DEPOSIT' ? (
                        <span className="flex items-center gap-2">
                          Bank deposit
                          {order.paymentProofPath && (
                            <button
                              type="button"
                              onClick={() => setProofImageUrl(getPaymentProofUrl(order.paymentProofPath) ?? null)}
                              className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
                            >
                              View proof
                            </button>
                          )}
                        </span>
                      ) : (
                        'COD'
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        disabled={updatingId === order.id || isTerminalStatus(order.status)}
                        className="rounded border border-slate-300 bg-white dark:bg-slate-800 px-2 py-1 text-sm font-medium text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
                        aria-label={`Update status for order ${order.id.slice(0, 8)}`}
                      >
                        {getAllowedNextStatuses(order.status).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {updatingId === order.id && (
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">Updating…</span>
                      )}
                      {order.statusHistory?.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" title="Last status change">
                          {formatDateTime(order.statusHistory[order.statusHistory.length - 1].createdAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {order.assignedToUserName ?? order.assignedToUserId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatDateTime(order.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
