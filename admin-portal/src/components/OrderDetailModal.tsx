/**
 * Order detail modal: full order info loaded via GET /orders/:id.
 * Accessible: focus trap, Escape to close, backdrop click, aria dialog, focus return.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api, getApiBaseUrl } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { formatMoney } from '../lib/formatMoney';
import type { Order, OrderStatus } from '../lib/types';
import { getAllowedNextStatuses, isTerminalStatus } from '../lib/orderStatus';

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
  onOrderUpdated?: () => void;
  /** Ref to the element that opened the modal (for focus return). */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  /** Build URL for payment proof image from path. */
  getPaymentProofUrl?: (path: string | null | undefined) => string | null;
  /** Called when user clicks "View proof" to show screenshot in parent modal. */
  onViewPaymentProof?: (url: string) => void;
}

function getProductImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = getApiBaseUrl().replace(/\/$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function OrderDetailModal({
  orderId,
  onClose,
  onOrderUpdated,
  returnFocusRef,
  getPaymentProofUrl,
  onViewPaymentProof,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const fetchOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Order>(`/orders/${id}`);
      if (res.data) setOrder(res.data);
      else setError('Order not found');
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setError(null);
      return;
    }
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    fetchOrder(orderId);
  }, [orderId, fetchOrder]);

  useEffect(() => {
    if (!orderId) return;
    closeButtonRef.current?.focus();
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key !== 'Tab' || !contentRef.current) return;
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first && last) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last && first) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [orderId, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    setUpdatingStatus(true);
    try {
      await api.put<Order>(`/orders/${order.id}`, { status: newStatus });
      await fetchOrder(order.id);
      onOrderUpdated?.();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleClose = () => {
    onClose();
    (returnFocusRef?.current ?? previouslyFocusedRef.current)?.focus();
  };

  if (!orderId) return null;

  const titleId = 'order-detail-modal-title';

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby="order-detail-modal-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60"
      onClick={handleOverlayClick}
    >
      <div
        ref={contentRef}
        id="order-detail-modal-description"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Order details
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-400" />
              <p className="mt-3 text-sm">Loading order…</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm font-medium text-red-700 underline dark:text-red-400"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {order && !loading && (
            <div className="space-y-6">
              {/* Order info */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Order</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">ID</dt>
                    <dd className="font-mono text-xs text-slate-900 dark:text-slate-100 break-all">{order.id}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                    <dd>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus || isTerminalStatus(order.status)}
                        className="rounded border border-slate-300 bg-white dark:bg-slate-800 px-2 py-1 text-sm font-medium text-slate-800 dark:text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
                        aria-label="Order status"
                      >
                        {getAllowedNextStatuses(order.status).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {updatingStatus && <span className="ml-1 text-xs text-slate-500">Updating…</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Total</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {formatMoney(order.totalCents, order.currency ?? 'PKR')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Payment</dt>
                    <dd className="text-slate-900 dark:text-slate-100">
                      {order.paymentMethod === 'BANK_DEPOSIT' ? (
                        <span className="flex items-center gap-2">
                          Bank deposit
                          {order.paymentProofPath && getPaymentProofUrl && onViewPaymentProof && (
                            <button
                              type="button"
                              onClick={() => {
                                const url = getPaymentProofUrl(order.paymentProofPath);
                                if (url) onViewPaymentProof(url);
                              }}
                              className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
                            >
                              View proof
                            </button>
                          )}
                        </span>
                      ) : (
                        'COD'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Created</dt>
                    <dd className="text-slate-700 dark:text-slate-300">{formatDateTime(order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Updated</dt>
                    <dd className="text-slate-700 dark:text-slate-300">{formatDateTime(order.updatedAt)}</dd>
                  </div>
                </dl>
              </section>

              {/* Customer & delivery */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Customer & delivery</h3>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                    <dd className="text-slate-900 dark:text-slate-100">{order.customerEmail}</dd>
                  </div>
                  {order.customerName && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Name</dt>
                      <dd className="text-slate-900 dark:text-slate-100">{order.customerName}</dd>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Phone</dt>
                      <dd className="text-slate-900 dark:text-slate-100">{order.customerPhone}</dd>
                    </div>
                  )}
                  {(order.shippingAddressLine1 || order.shippingAddressLine2 || order.shippingCity || order.shippingPostalCode || order.shippingCountry) && (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500 dark:text-slate-400">Shipping address</dt>
                      <dd className="mt-1 text-slate-900 dark:text-slate-100">
                        {[
                          order.shippingAddressLine1,
                          order.shippingAddressLine2,
                          [order.shippingCity, order.shippingPostalCode].filter(Boolean).join(' '),
                          order.shippingCountry,
                        ].filter(Boolean).join(', ')}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Items */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Items</h3>
                <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">
                          Product
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                          Qty
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                          Unit price
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                          Line total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                      {order.items.map((item) => {
                        const lineTotalCents = item.unitCents * item.quantity;
                        const imgUrl = getProductImageUrl(item.productImage);
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {imgUrl && (
                                  <img
                                    src={imgUrl}
                                    alt=""
                                    className="h-12 w-12 shrink-0 rounded object-cover bg-slate-100 dark:bg-slate-700"
                                  />
                                )}
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {item.productName ?? item.productId}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-300">
                              {formatMoney(item.unitCents, order.currency ?? 'PKR')}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                              {formatMoney(lineTotalCents, order.currency ?? 'PKR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Status history */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Status history</h3>
                {order.statusHistory?.length ? (
                  <ul className="space-y-2">
                    {order.statusHistory.map((entry, i) => (
                      <li
                        key={entry.createdAt + entry.status + i}
                        className="flex items-center justify-between rounded border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100">{entry.status}</span>
                        <span className="text-slate-500 dark:text-slate-400">{formatDateTime(entry.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No status changes yet.</p>
                )}
              </section>

              {/* Assigned to */}
              <section>
                <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400">Assigned to</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {order.assignedToUserName ?? order.assignedToUserId ?? '—'}
                </p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
