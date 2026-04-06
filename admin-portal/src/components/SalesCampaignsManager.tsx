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

const STATUS_COLORS: Record<SalesCampaignDisplayStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
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
    try {
      await deleteSalesCampaign(id);
      fetchList();
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublish = async (id: string) => {
    await publishSalesCampaign(id);
    fetchList();
  };

  const handlePause = async (id: string) => {
    await pauseSalesCampaign(id);
    fetchList();
  };

  const handleResume = async (id: string) => {
    await resumeSalesCampaign(id);
    fetchList();
  };

  const handleDuplicate = async (id: string) => {
    await duplicateSalesCampaign(id);
    fetchList();
  };

  if (!canRead) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">You do not have permission to view sales campaigns.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sales Campaigns</h1>
        {canWrite && (
          <button
            onClick={() => { setEditingCampaign(null); setFormOpen('add'); }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Campaign
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search campaigns…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {debouncedSearch || statusFilter ? 'No campaigns match your filters.' : 'No sales campaigns yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dates</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                  <td className="px-4 py-3">
                    <a href={`/admin/sales-campaigns/detail?id=${c.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                      {c.name}
                    </a>
                    {c.badgeText && <span className="ml-2 text-xs text-gray-400">"{c.badgeText}"</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.displayStatus]}`}>
                      {c.displayStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCampaignValue(c)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {c.applyTo === 'ALL_PRODUCTS' ? 'All products' :
                      c.applyTo === 'SPECIFIC_PRODUCTS' ? `${c.productCount} product${c.productCount !== 1 ? 's' : ''}` :
                      `${c.categoryCount} categor${c.categoryCount !== 1 ? 'ies' : 'y'}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(c.startsAt)} — {formatDate(c.endsAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canWrite && c.displayStatus === 'DRAFT' && (
                        <button onClick={() => handlePublish(c.id)} title="Publish" className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition text-xs font-medium">
                          Publish
                        </button>
                      )}
                      {canWrite && c.displayStatus === 'ACTIVE' && (
                        <button onClick={() => handlePause(c.id)} title="Pause" className="rounded p-1 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition text-xs font-medium">
                          Pause
                        </button>
                      )}
                      {canWrite && c.displayStatus === 'PAUSED' && (
                        <button onClick={() => handleResume(c.id)} title="Resume" className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-xs font-medium">
                          Resume
                        </button>
                      )}
                      {canWrite && (
                        <button onClick={() => { setEditingCampaign(c); setFormOpen('edit'); }} title="Edit" className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      {canWrite && (
                        <button onClick={() => handleDuplicate(c.id)} title="Duplicate" className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      )}
                      {canWrite && (
                        <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} title="Delete" className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Previous
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Next
            </button>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setFormOpen(null); setEditingCampaign(null); }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formOpen === 'add' ? 'Create Campaign' : 'Edit Campaign'}
              </h2>
              <button onClick={() => { setFormOpen(null); setEditingCampaign(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <SalesCampaignForm
                initial={editingCampaign ?? undefined}
                onSubmit={formOpen === 'add' ? handleCreate : handleUpdate}
                onCancel={() => { setFormOpen(null); setEditingCampaign(null); }}
                submitLabel={formOpen === 'add' ? 'Create Campaign' : 'Save Changes'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
