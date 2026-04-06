import { useState, useEffect, useCallback } from 'react';
import { getSalesCampaign, publishSalesCampaign, pauseSalesCampaign, resumeSalesCampaign, deleteSalesCampaign, updateSalesCampaign, getApiBaseUrl } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { formatMoney } from '../lib/formatMoney';
import type { SalesCampaign, SalesCampaignDisplayStatus, SalesCampaignFormData } from '../lib/types';
import { SalesCampaignForm } from './SalesCampaignForm';

const STATUS_BADGE: Record<SalesCampaignDisplayStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  PAUSED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ENDED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function computeSalePrice(baseCents: number, type: string, value: number): number {
  if (type === 'PERCENTAGE') return Math.max(0, baseCents - Math.round(baseCents * value / 100));
  return Math.max(0, baseCents - value);
}

function getIdFromQuery(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

export function SalesCampaignDetail({ campaignId: propId }: { campaignId: string }) {
  const campaignId = (propId && propId.trim()) || getIdFromQuery();
  const [campaign, setCampaign] = useState<SalesCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const canRead = hasPermission('sales-campaigns:read');
  const canWrite = hasPermission('sales-campaigns:write');

  const fetchCampaign = useCallback(async () => {
    if (!campaignId || !canRead) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await getSalesCampaign(campaignId);
      setCampaign(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId, canRead]);

  useEffect(() => {
    if (!campaignId) { setLoading(false); setError('No campaign ID'); return; }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) { setError(`Request timed out. Check the API is running at ${getApiBaseUrl()}`); setLoading(false); }
    }, 15000);
    (async () => {
      try {
        await fetchCampaign();
      } finally {
        if (!cancelled) window.clearTimeout(timeout);
      }
    })();
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [campaignId]);

  const handlePublish = async () => { if (!campaign) return; await publishSalesCampaign(campaign.id); fetchCampaign(); };
  const handlePause = async () => { if (!campaign) return; await pauseSalesCampaign(campaign.id); fetchCampaign(); };
  const handleResume = async () => { if (!campaign) return; await resumeSalesCampaign(campaign.id); fetchCampaign(); };
  const handleDelete = async () => {
    if (!campaign || !confirm('Delete this campaign?')) return;
    await deleteSalesCampaign(campaign.id);
    window.location.href = '/admin/sales-campaigns';
  };
  const handleUpdate = async (data: SalesCampaignFormData) => {
    if (!campaign) return;
    await updateSalesCampaign(campaign.id, data);
    setEditing(false);
    fetchCampaign();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-300" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
        <p className="font-medium">{error ?? 'Campaign not found'}</p>
        <a href="/admin/sales-campaigns" className="mt-3 inline-block text-sm underline">
          ← Back to Sales Campaigns
        </a>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <a href="#" onClick={(e) => { e.preventDefault(); setEditing(false); }} className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
          ← Back to detail
        </a>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Edit Campaign</h2>
        <SalesCampaignForm
          initial={campaign}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const c = campaign;
  const discountLabel = c.type === 'PERCENTAGE' ? `${c.value}%` : formatMoney(c.value, 'PKR');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <a href="/admin/sales-campaigns" className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
            ← Sales Campaigns
          </a>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{c.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {discountLabel} off · {c.applyTo === 'ALL_PRODUCTS' ? 'All products' : c.applyTo === 'SPECIFIC_PRODUCTS' ? `${c.productCount} products` : `${c.categoryCount} categories`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[c.displayStatus]}`}>
            {c.displayStatus}
          </span>
          {canWrite && c.displayStatus === 'DRAFT' && (
            <button type="button" onClick={handlePublish} className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500">Publish</button>
          )}
          {canWrite && c.displayStatus === 'ACTIVE' && (
            <button type="button" onClick={handlePause} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Pause</button>
          )}
          {canWrite && c.displayStatus === 'PAUSED' && (
            <button type="button" onClick={handleResume} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Resume</button>
          )}
          {canWrite && c.displayStatus !== 'ENDED' && (
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Edit</button>
          )}
          {canWrite && (
            <button type="button" onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">Delete</button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Type</dt><dd>{c.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Value</dt><dd>{discountLabel} off</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Starts</dt><dd>{formatDateTime(c.startsAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Ends</dt><dd>{formatDateTime(c.endsAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Priority</dt><dd>{c.priority}</dd></div>
            {c.badgeText && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Badge</dt><dd>"{c.badgeText}"</dd></div>}
            {c.description && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Description</dt><dd className="text-right max-w-[200px] truncate">{c.description}</dd></div>}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Metadata</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Slug</dt><dd className="font-mono text-xs">{c.slug}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Scope</dt><dd>{c.applyTo === 'ALL_PRODUCTS' ? 'All products' : c.applyTo === 'SPECIFIC_PRODUCTS' ? 'Specific products' : 'Specific categories'}</dd></div>
            {c.createdBy && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Created by</dt><dd>{c.createdBy.name}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Created</dt><dd>{formatDateTime(c.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Updated</dt><dd>{formatDateTime(c.updatedAt)}</dd></div>
          </dl>
        </section>
      </div>

      {c.products.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="px-6 pt-6 pb-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Products ({c.products.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Product</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Base Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Sale Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-800">
                {c.products.map((p) => {
                  const effectiveValue = p.overrideValue ?? c.value;
                  const salePrice = computeSalePrice(p.product.priceCents, c.type, effectiveValue);
                  return (
                    <tr key={p.productId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{p.product.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500 line-through">{formatMoney(p.product.priceCents, 'PKR')}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600 dark:text-emerald-400">{formatMoney(salePrice, 'PKR')}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-400">{p.overrideValue != null ? `${p.overrideValue}${c.type === 'PERCENTAGE' ? '%' : ' cents'}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {c.categories.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Categories ({c.categories.length})</h2>
          <div className="flex flex-wrap gap-2">
            {c.categories.map((cat) => (
              <span key={cat.categoryId} className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-sm text-slate-700 dark:text-slate-300">
                {cat.category.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
