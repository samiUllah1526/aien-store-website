import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../lib/formatMoney';
import type { Voucher, VoucherFormData } from '../lib/types';
import { VoucherForm } from './VoucherForm';

const PAGE_SIZE = 15;
const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'upcoming', label: 'Upcoming' },
];

function formatVoucherValue(v: Voucher): string {
  switch (v.type) {
    case 'PERCENTAGE':
      return `${v.value}% off`;
    case 'FIXED_AMOUNT':
      return `${formatMoney(v.value, 'PKR')} off`;
    case 'FREE_SHIPPING':
      return 'Free shipping';
    default:
      return '—';
  }
}

function voucherStatus(v: Voucher): 'active' | 'expired' | 'upcoming' {
  const now = new Date();
  const start = new Date(v.startDate);
  const expiry = new Date(v.expiryDate);
  if (!v.isActive) return 'expired';
  if (expiry < now) return 'expired';
  if (start > now) return 'upcoming';
  return 'active';
}

export function VouchersManager() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<'add' | 'edit' | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statsModalId, setStatsModalId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput.trim(), 400);

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };
  const canRead = hasPermission('vouchers:read');
  const canWrite = hasPermission('vouchers:write');

  const fetchList = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.statusFilter = statusFilter;
      const res = await api.getList<Voucher>('/vouchers', params);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vouchers');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!formOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFormOpen(null);
        setEditingVoucher(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleCreate = async (data: VoucherFormData) => {
    await api.post('/vouchers', data);
    setFormOpen(null);
    fetchList();
  };

  const handleUpdate = async (data: VoucherFormData) => {
    if (!editingVoucher) return;
    await api.put(`/vouchers/${editingVoucher.id}`, data);
    setFormOpen(null);
    setEditingVoucher(null);
    fetchList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this voucher? This cannot be undone.')) return;
    setDeletingId(id);
    setError(null);
    try {
      await api.delete(`/vouchers/${id}`);
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (v: Voucher) => {
    const next = !v.isActive;
    try {
      await api.patch(`/vouchers/${v.id}/status`, { isActive: next });
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (!canRead) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        You don't have permission to view vouchers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Vouchers</h1>
          <a
            href="/admin/docs/vouchers"
            className="mt-1 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            How to create and manage vouchers
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setEditingVoucher(null);
              setFormOpen('add');
            }}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            Create voucher
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="voucher-search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Search code
          </label>
          <input
            id="voucher-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. SUMMER20"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          />
        </div>
        <div className="w-40">
          <label htmlFor="statusFilter" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label htmlFor="sortBy" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sort by
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="createdAt">Date</option>
            <option value="code">Code</option>
            <option value="expiryDate">Expiry</option>
            <option value="usedCount">Uses</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setSearchInput('');
            setStatusFilter('');
            setPage(1);
            setError(null);
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Clear
        </button>
      </form>

      {/* Modal: Add / Edit voucher */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voucher-form-title"
          onClick={(e) => e.target === e.currentTarget && (setFormOpen(null), setEditingVoucher(null))}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700">
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 id="voucher-form-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formOpen === 'add' ? 'Create voucher' : 'Edit voucher'}
              </h2>
            </div>
            <div className="p-6">
              <VoucherForm
                voucher={editingVoucher ?? undefined}
                onSubmit={formOpen === 'add' ? handleCreate : handleUpdate}
                onCancel={() => {
                  setFormOpen(null);
                  setEditingVoucher(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Value</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Used / Limit</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Expiry</th>
                {canWrite && (
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td colSpan={canWrite ? 7 : 6} className="px-4 py-6">
                    <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {debouncedSearch || statusFilter
            ? 'No vouchers match your filters.'
            : 'No vouchers yet. Create one to get started.'}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Used / Limit</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Expiry</th>
                    {canWrite && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                  {items.map((v) => {
                    const status = voucherStatus(v);
                    const usedLimit =
                      v.usageLimitGlobal != null
                        ? `${v.usedCount} / ${v.usageLimitGlobal}`
                        : `${v.usedCount}`;
                    return (
                      <tr
                        key={v.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button, a')) return;
                          window.location.href = `/admin/vouchers/detail?id=${v.id}`;
                        }}
                        onKeyDown={(e) => {
                          if ((e.target as HTMLElement).closest('button, a')) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            window.location.href = `/admin/vouchers/detail?id=${v.id}`;
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/admin/vouchers/detail?id=${v.id}`}
                              className="font-mono font-medium text-slate-900 hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
                            >
                              {v.code}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(v.code, v.id)}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                              title={copiedId === v.id ? 'Copied!' : 'Copy code'}
                              aria-label={copiedId === v.id ? 'Copied!' : 'Copy code'}
                            >
                              {copiedId === v.id ? (
                                <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {v.type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {formatVoucherValue(v)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : status === 'expired'
                                  ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}
                          >
                            {status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : 'Upcoming'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {usedLimit}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {new Date(v.expiryDate).toLocaleDateString()}
                        </td>
                        {canWrite && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setStatsModalId(v.id)}
                              className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                              Stats
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(v)}
                              className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                              {v.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVoucher(v);
                                setFormOpen('edit');
                              }}
                              className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id)}
                              disabled={deletingId === v.id}
                              className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            >
                              {deletingId === v.id ? '…' : 'Delete'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {statsModalId && (
        <VoucherStatsModal
          voucherId={statsModalId}
          onClose={() => setStatsModalId(null)}
        />
      )}
    </div>
  );
}

function VoucherStatsModal({ voucherId, onClose }: { voucherId: string; onClose: () => void }) {
  const [stats, setStats] = useState<{
    totalRedemptions: number;
    revenueImpactCents: number;
    remainingUses: number | null;
    usedCount: number;
    usageLimitGlobal: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<typeof stats>(`/vouchers/${voucherId}/stats`)
      .then((r) => setStats(r.data ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [voucherId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="stats-modal-title" className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Voucher analytics
        </h2>
        {loading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading…</p>
        ) : stats ? (
          <div className="space-y-3">
            <p className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Total redemptions</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{stats.totalRedemptions}</span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Revenue impact</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {formatMoney(stats.revenueImpactCents, 'PKR')}
              </span>
            </p>
            <p className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Used / Limit</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {stats.usageLimitGlobal != null
                  ? `${stats.usedCount} / ${stats.usageLimitGlobal}`
                  : `${stats.usedCount}`}
              </span>
            </p>
            {stats.remainingUses != null && (
              <p className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Remaining uses</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{stats.remainingUses}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">Could not load stats.</p>
        )}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
