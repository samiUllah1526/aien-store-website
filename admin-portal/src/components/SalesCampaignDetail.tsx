import { useState, useEffect, useCallback } from 'react';
import { getSalesCampaign, publishSalesCampaign, pauseSalesCampaign, resumeSalesCampaign, deleteSalesCampaign, updateSalesCampaign } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { formatMoney } from '../lib/formatMoney';
import type { SalesCampaign, SalesCampaignDisplayStatus, SalesCampaignFormData } from '../lib/types';
import { SalesCampaignForm } from './SalesCampaignForm';

const STATUS_COLORS: Record<SalesCampaignDisplayStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function computeSalePrice(baseCents: number, type: string, value: number): number {
  if (type === 'PERCENTAGE') return Math.max(0, baseCents - Math.round(baseCents * value / 100));
  return Math.max(0, baseCents - value);
}

export function SalesCampaignDetail({ campaignId }: { campaignId: string }) {
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

  useEffect(() => { fetchCampaign(); }, [fetchCampaign]);

  const handlePublish = async () => {
    if (!campaign) return;
    await publishSalesCampaign(campaign.id);
    fetchCampaign();
  };

  const handlePause = async () => {
    if (!campaign) return;
    await pauseSalesCampaign(campaign.id);
    fetchCampaign();
  };

  const handleResume = async () => {
    if (!campaign) return;
    await resumeSalesCampaign(campaign.id);
    fetchCampaign();
  };

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

  if (!canRead) return <div className="p-8 text-center text-gray-500">No permission.</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!campaign) return <div className="p-8 text-center text-gray-500">Campaign not found.</div>;

  if (editing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <button onClick={() => setEditing(false)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← Back to detail</button>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Edit Campaign</h2>
        <SalesCampaignForm
          initial={campaign}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
          submitLabel="Save Changes"
        />
      </div>
    );
  }

  const c = campaign;
  const discountLabel = c.type === 'PERCENTAGE' ? `${c.value}%` : formatMoney(c.value, 'PKR');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <a href="/admin/sales-campaigns" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">← All Campaigns</a>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{c.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[c.displayStatus]}`}>
            {c.displayStatus}
          </span>
          {canWrite && c.displayStatus === 'DRAFT' && (
            <button onClick={handlePublish} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition">Publish</button>
          )}
          {canWrite && c.displayStatus === 'ACTIVE' && (
            <button onClick={handlePause} className="rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 transition">Pause</button>
          )}
          {canWrite && c.displayStatus === 'PAUSED' && (
            <button onClick={handleResume} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition">Resume</button>
          )}
          {canWrite && c.displayStatus !== 'ENDED' && (
            <button onClick={() => setEditing(true)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Edit</button>
          )}
          {canWrite && (
            <button onClick={handleDelete} className="rounded-lg border border-red-300 dark:border-red-700 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">Delete</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InfoCard label="Discount" value={`${discountLabel} off`} />
        <InfoCard label="Type" value={c.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'} />
        <InfoCard label="Priority" value={String(c.priority)} />
        <InfoCard label="Starts" value={formatDate(c.startsAt)} />
        <InfoCard label="Ends" value={formatDate(c.endsAt)} />
        <InfoCard label="Scope" value={c.applyTo === 'ALL_PRODUCTS' ? 'All Products' : c.applyTo === 'SPECIFIC_PRODUCTS' ? 'Specific Products' : 'Specific Categories'} />
        {c.badgeText && <InfoCard label="Badge Text" value={c.badgeText} />}
        {c.description && <InfoCard label="Description" value={c.description} />}
        {c.createdBy && <InfoCard label="Created By" value={c.createdBy.name} />}
        <InfoCard label="Created" value={formatDate(c.createdAt)} />
      </div>

      {c.products.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Products ({c.products.length})</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {c.products.map((p) => {
                  const effectiveValue = p.overrideValue ?? c.value;
                  const salePrice = computeSalePrice(p.product.priceCents, c.type, effectiveValue);
                  return (
                    <tr key={p.productId}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.product.name}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 line-through">{formatMoney(p.product.priceCents, 'PKR')}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">{formatMoney(salePrice, 'PKR')}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-400">{p.overrideValue != null ? `${p.overrideValue}${c.type === 'PERCENTAGE' ? '%' : ' cents'}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {c.categories.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Categories ({c.categories.length})</h3>
          <div className="flex flex-wrap gap-2">
            {c.categories.map((cat) => (
              <span key={cat.categoryId} className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                {cat.category.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
}
