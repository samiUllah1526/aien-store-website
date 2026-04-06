import { useState, useEffect, useCallback } from 'react';
import { api, deleteSalesCampaign, duplicateSalesCampaign, publishSalesCampaign, pauseSalesCampaign, resumeSalesCampaign } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../lib/formatMoney';
import type { SalesCampaign, SalesCampaignFormData, SalesCampaignDisplayStatus } from '../lib/types';
import { SalesCampaignForm } from './SalesCampaignForm';

const PAGE_SIZE = 15;
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
];

const STATUS_BADGE: Record<SalesCampaignDisplayStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  PAUSED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ENDED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

function formatCampaignValue(c: SalesCampaign): string {
  return c.type === 'PERCENTAGE' ? `${c.value}% off` : `${formatMoney(c.value, 'PKR')} off`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SalesCampaignsManager() {
  const [items, setItems] = useState<SalesCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState<'add' | 'edit' | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<SalesCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const debouncedSearch = useDebounce(searchInput.trim(), 400);
  const canRead = hasPermission('sales-campaigns:read');
  const canWrite = hasPermission('sales-campaigns:write');

  const fetchList = useCallback(async () => {
    if (!canRead) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number | undefined> = {
        page, limit: PAGE_SIZE, sortBy, sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.displayStatus = statusFilter;
      const res = await api.getList<SalesCampaign>('/sales-campaigns', params);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, debouncedSearch, statusFilter, sortBy, sortOrder]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);
  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => {
    if (!formOpen) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { setFormOpen(null); setEditingCampaign(null); } };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [formOpen]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const handleCreate = async (data: SalesCampaignFormData) => {
    await api.post('/sales-campaigns', data);
    setFormOpen(null);
    fetchList();
  };

  const handleUpdate = async (data: SalesCampaignFormData) => {
    if (!editingCampaign) return;
    await api.patch(`/sales-campaigns/${editingCampaign.id}`, data);
    setFormOpen(null);
    setEditingCampaign(null);
    fetchList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteSalesCampaign(id);
      fetchList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (id: string) => { await publishSalesCampaign(id); fetchList(); };
  const handlePause = async (id: string) => { await pauseSalesCampaign(id); fetchList(); };
  const handleResume = async (id: string) => { await resumeSalesCampaign(id); fetchList(); };
  const handleDuplicate = async (id: string) => { await duplicateSalesCampaign(id); fetchList(); };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="p-12 text-center">
            <div className="mx-auto h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        You don't have permission to view sales campaigns.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sales Campaigns</h1>
        {canWrite && (
          <button
            type="button"
            onClick={() => { setEditingCampaign(null); setFormOpen('add'); }}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            Create campaign
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
          <label htmlFor="campaign-search" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Search
          </label>
          <input
            id="campaign-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. Eid Sale"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
          />
        </div>
        <div className="w-40">
          <label htmlFor="campaign-status" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Status
          </label>
          <select
            id="campaign-status"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className="w-36">
          <label htmlFor="campaign-sort" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sort by
          </label>
          <select
            id="campaign-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="createdAt">Date</option>
            <option value="name">Name</option>
            <option value="startsAt">Start</option>
            <option value="endsAt">End</option>
            <option value="priority">Priority</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setSearchInput(''); setStatusFilter(''); setPage(1); setError(null); }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Clear
        </button>
      </form>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && (setFormOpen(null), setEditingCampaign(null))}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formOpen === 'add' ? 'Create campaign' : 'Edit campaign'}
              </h2>
              <button
                type="button"
                onClick={() => { setFormOpen(null); setEditingCampaign(null); }}
                className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <SalesCampaignForm
                initial={editingCampaign ?? undefined}
                onSubmit={formOpen === 'add' ? handleCreate : handleUpdate}
                onCancel={() => { setFormOpen(null); setEditingCampaign(null); }}
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Discount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Scope</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Dates</th>
                {canWrite && <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td colSpan={canWrite ? 6 : 5} className="px-4 py-6">
                    <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {debouncedSearch || statusFilter ? 'No campaigns match your filters.' : 'No sales campaigns yet. Create one to get started.'}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Discount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Scope</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Dates</th>
                    {canWrite && <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button, a')) return;
                        window.location.href = `/admin/sales-campaigns/detail?id=${c.id}`;
                      }}
                      onKeyDown={(e) => {
                        if ((e.target as HTMLElement).closest('button, a')) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          window.location.href = `/admin/sales-campaigns/detail?id=${c.id}`;
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <a
                          href={`/admin/sales-campaigns/detail?id=${c.id}`}
                          className="font-medium text-slate-900 hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
                        >
                          {c.name}
                        </a>
                        {c.badgeText && <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">"{c.badgeText}"</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[c.displayStatus]}`}>
                          {c.displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{formatCampaignValue(c)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {c.applyTo === 'ALL_PRODUCTS' ? 'All products' :
                          c.applyTo === 'SPECIFIC_PRODUCTS' ? `${c.productCount} product${c.productCount !== 1 ? 's' : ''}` :
                          `${c.categoryCount} categor${c.categoryCount !== 1 ? 'ies' : 'y'}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(c.startsAt)} — {formatDate(c.endsAt)}
                      </td>
                      {canWrite && (
                        <td className="px-4 py-3 text-right">
                          {c.displayStatus === 'DRAFT' && (
                            <button type="button" onClick={() => handlePublish(c.id)} className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                              Publish
                            </button>
                          )}
                          {c.displayStatus === 'ACTIVE' && (
                            <button type="button" onClick={() => handlePause(c.id)} className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                              Pause
                            </button>
                          )}
                          {c.displayStatus === 'PAUSED' && (
                            <button type="button" onClick={() => handleResume(c.id)} className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                              Resume
                            </button>
                          )}
                          <button type="button" onClick={() => { setEditingCampaign(c); setFormOpen('edit'); }} className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDuplicate(c.id)} className="mr-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                            Duplicate
                          </button>
                          <button type="button" onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50">
                            {deletingId === c.id ? '…' : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
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
    </div>
  );
}
