import { useState, useEffect, useCallback } from 'react';
import type { ProductListItem, Category } from '../lib/types';
import { AdjustStockModal } from './AdjustStockModal';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 15;
const STOCK_FILTERS = [
  { value: 'all', label: 'All products' },
  { value: 'low_stock', label: 'Low stock (1–10)' },
  { value: 'out_of_stock', label: 'Out of stock (0)' },
] as const;
const SORT_OPTIONS = [
  { value: 'stockQuantity', label: 'Stock (low first)' },
  { value: 'stockQuantityDesc', label: 'Stock (high first)' },
  { value: 'name', label: 'Name' },
] as const;

export function InventoryManager() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [lowStockMax, setLowStockMax] = useState(10);
  const [sortBy, setSortBy] = useState('stockQuantity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<ProductListItem | null>(null);

  const debouncedSearch = useDebounce(searchInput.trim(), 400);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<Category[]>('/categories');
      setCategories(res.data ?? []);
    } catch {
      setCategories([]);
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sortField, order] = sortBy === 'stockQuantityDesc' ? ['stockQuantity', 'desc'] : [sortBy, sortOrder];
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
        sortBy: sortField,
        sortOrder: order,
        stockFilter,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (stockFilter === 'low_stock') params.lowStockMax = lowStockMax;

      const res = await api.getList<ProductListItem>('/products', params);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter, stockFilter, lowStockMax, sortBy, sortOrder]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleClearFilters = () => {
    setSearchInput('');
    setCategoryFilter('');
    setStockFilter('all');
    setPage(1);
    setError(null);
  };

  const handleStockAdjusted = (productId: string, newStockQuantity: number) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stockQuantity: newStockQuantity, inStock: newStockQuantity > 0 }
          : p,
      ),
    );
    setSuccessMessage('Stock updated successfully.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const historyUrl = (productId: string) => `/admin/inventory/history?productId=${encodeURIComponent(productId)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Available stock per product. Adjustments are logged with who, when, and why.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); setPage(1); }}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="inv-search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Search
            </label>
            <input
              id="inv-search"
              type="search"
              placeholder="Name, slug, description…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>
          <div>
            <label htmlFor="inv-category" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Category
            </label>
            <select
              id="inv-category"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="inv-stock" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Stock level
            </label>
            <select
              id="inv-stock"
              value={stockFilter}
              onChange={(e) => { setStockFilter(e.target.value as typeof stockFilter); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {STOCK_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {stockFilter === 'low_stock' && (
            <div>
              <label htmlFor="inv-low-max" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Low stock max
              </label>
              <input
                id="inv-low-max"
                type="number"
                min={1}
                value={lowStockMax}
                onChange={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v >= 1) setLowStockMax(v); setPage(1); }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}
          <div>
            <label htmlFor="inv-sort" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Sort by
            </label>
            <select
              id="inv-sort"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div
          className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
          role="status"
          aria-live="polite"
        >
          {successMessage}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong>Available</strong> = sellable quantity (used at checkout). Reserved = 0 in current flow.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-600 dark:text-slate-400">
            {(debouncedSearch || categoryFilter || stockFilter !== 'all')
              ? 'No products match your filters.'
              : 'No products yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Available
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((item) => {
                  const qty = item.stockQuantity ?? 0;
                  const isOut = !(item.inStock ?? qty > 0);
                  const isLow = qty >= 1 && qty <= lowStockMax;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{item.name}</span>
                        <span className="ml-1 text-slate-500 dark:text-slate-400 text-xs">/{item.slug}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        {qty}
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            Low stock
                          </span>
                        ) : (
                          <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-600 dark:text-slate-200">
                            In stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setAdjustProduct(item)}
                          className="mr-3 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 text-sm font-medium"
                        >
                          Adjust
                        </button>
                        <a
                          href={historyUrl(item.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 text-sm font-medium"
                        >
                          View history
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {adjustProduct && (
        <AdjustStockModal
          product={{
            id: adjustProduct.id,
            name: adjustProduct.name,
            stockQuantity: adjustProduct.stockQuantity ?? 0,
          }}
          onClose={() => setAdjustProduct(null)}
          onSuccess={(newQty) => {
            handleStockAdjusted(adjustProduct.id, newQty);
          }}
        />
      )}
    </div>
  );
}
