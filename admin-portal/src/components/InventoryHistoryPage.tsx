import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface InventoryMovementRow {
  id: string;
  variantId: string | null;
  variantColor: string | null;
  variantSize: string | null;
  type: string;
  quantityDelta: number;
  reference: string | null;
  performedByUserId: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  performedByRoleNames: string[];
  stockBefore: number | null;
  stockAfter: number | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

function formatMovementType(type: string): string {
  switch (type) {
    case 'SALE':
      return 'Sale (order)';
    case 'RESTORE':
      return 'Restore (cancelled order)';
    case 'ADJUSTMENT':
      return 'Adjustment';
    default:
      return type;
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

function getProductIdFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('productId')?.trim() ?? '';
}

interface InventoryHistoryPageProps {
  productId: string;
  initialVariantId?: string;
}

type ProductVariantSummary = {
  id: string;
  color: string;
  size: string;
  isActive: boolean;
};

export function InventoryHistoryPage({ productId: productIdProp, initialVariantId = '' }: InventoryHistoryPageProps) {
  const productId = productIdProp?.trim() || getProductIdFromUrl();
  const [variants, setVariants] = useState<ProductVariantSummary[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(initialVariantId.trim());

  const [productName, setProductName] = useState<string>('');
  const [items, setItems] = useState<InventoryMovementRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<string | null>(null);

  useEffect(() => {
    if (!productId?.trim()) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [productRes, movementsRes] = await Promise.all([
          api.get<{ name: string; variants?: ProductVariantSummary[] }>(`/products/${productId}`),
          api.getList<InventoryMovementRow>(
            `/inventory/products/${productId}/movements`,
            { page: 1, limit: PAGE_SIZE, ...(selectedVariantId ? { variantId: selectedVariantId } : {}) },
          ),
        ]);
        if (cancelled) return;
        setProductName(productRes.data?.name ?? 'Product');
        setVariants(productRes.data?.variants ?? []);
        setItems(movementsRes.data ?? []);
        setTotal(movementsRes.meta?.total ?? 0);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load history');
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId, selectedVariantId]);

  const loadPage = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await api.getList<InventoryMovementRow>(
        `/inventory/products/${productId}/movements`,
        { page: pageNum, limit: PAGE_SIZE, ...(selectedVariantId ? { variantId: selectedVariantId } : {}) },
      );
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
      setPage(pageNum);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  if (!productId?.trim()) {
    return (
      <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        Missing product. Open history from the Inventory page.
        <p className="mt-2">
          <a href="/admin/inventory" className="underline">Back to Inventory</a>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
        {error}
        <p className="mt-2">
          <a href="/admin/inventory" className="underline">Back to Inventory</a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Movement history — {productName}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <a href="/admin/inventory" className="underline hover:no-underline">← Back to Inventory</a>
        </p>
        {variants.length > 0 && (
          <div className="max-w-sm">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Variant filter
            </label>
            <select
              value={selectedVariantId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedVariantId(value);
                setPage(1);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  if (value) url.searchParams.set('variantId', value);
                  else url.searchParams.delete('variantId');
                  window.history.replaceState(null, '', url.toString());
                }
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All variants</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.color} / {variant.size}{variant.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="text-slate-500 dark:text-slate-400">Loading…</div>
      ) : items.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400">No movements yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Date & time</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Variant</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Change</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Stock before</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">Stock after</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Reason / reference</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Performed by</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3">{formatMovementType(m.type)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {m.variantColor || m.variantSize
                      ? `${m.variantColor ?? '—'} / ${m.variantSize ?? '—'}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {m.quantityDelta > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">+{m.quantityDelta}</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">{m.quantityDelta}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {m.stockBefore !== null ? m.stockBefore : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {m.stockAfter !== null ? m.stockAfter : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[220px]">
                    {(() => {
                      const ref = m.reference ?? '';
                      if (ref.length > 20) {
                        return (
                          <>
                            {ref.slice(0, 20)}…
                            <button
                              type="button"
                              onClick={() => setReasonModal(ref)}
                              className="ml-1.5 text-slate-700 dark:text-slate-300 underline hover:no-underline font-medium"
                            >
                              View
                            </button>
                          </>
                        );
                      }
                      return ref || '—';
                    })()}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{m.performedByName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.performedByEmail ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {m.performedByRoleNames?.length ? m.performedByRoleNames.join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => loadPage(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {reasonModal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reason-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700 p-6">
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 id="reason-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Reason / reference
              </h2>
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap wrap-break-word">
              {reasonModal}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
