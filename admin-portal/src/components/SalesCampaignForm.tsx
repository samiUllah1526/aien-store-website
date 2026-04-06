import { useState } from 'react';
import type { SalesCampaign, SalesCampaignFormData, SalesCampaignType, SalesCampaignScope } from '../lib/types';

function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  initial?: SalesCampaign;
  onSubmit: (data: SalesCampaignFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function SalesCampaignForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<SalesCampaignType>(initial?.type ?? 'PERCENTAGE');
  const [value, setValue] = useState(initial?.value ?? 10);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initial?.endsAt));
  const [applyTo, setApplyTo] = useState<SalesCampaignScope>(initial?.applyTo ?? 'ALL_PRODUCTS');
  const [badgeText, setBadgeText] = useState(initial?.badgeText ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [productIdsText, setProductIdsText] = useState(
    (initial?.products ?? []).map((p) => p.productId).join(', '),
  );
  const [categoryIdsText, setCategoryIdsText] = useState(
    (initial?.categories ?? []).map((c) => c.categoryId).join(', '),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Name is required'); return; }
    if (!startsAt) { setError('Start date is required'); return; }
    if (!endsAt) { setError('End date is required'); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { setError('End date must be after start date'); return; }
    if (type === 'PERCENTAGE' && (value < 1 || value > 100)) { setError('Percentage must be 1–100'); return; }
    if (value < 1) { setError('Value must be at least 1'); return; }

    const productIds = applyTo === 'SPECIFIC_PRODUCTS'
      ? productIdsText.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
      : undefined;
    const categoryIds = applyTo === 'SPECIFIC_CATEGORIES'
      ? categoryIdsText.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
      : undefined;

    if (applyTo === 'SPECIFIC_PRODUCTS' && (!productIds || productIds.length === 0)) {
      setError('At least one product ID is required');
      return;
    }
    if (applyTo === 'SPECIFIC_CATEGORIES' && (!categoryIds || categoryIds.length === 0)) {
      setError('At least one category ID is required');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        type,
        value,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        applyTo,
        badgeText: badgeText.trim() || undefined,
        priority,
        productIds,
        categoryIds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Campaign Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Eid Sale 2026" className={fieldClass} maxLength={100} />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Auto-generated from name" className={fieldClass} maxLength={120} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={fieldClass} maxLength={500} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Discount Type *</label>
          <select value={type} onChange={(e) => setType(e.target.value as SalesCampaignType)} className={fieldClass}>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed Amount (cents)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Value * {type === 'PERCENTAGE' ? '(1–100)' : '(cents)'}</label>
          <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} min={1} max={type === 'PERCENTAGE' ? 100 : undefined} className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Starts At *</label>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className={labelClass}>Ends At *</label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={fieldClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Apply To *</label>
        <select value={applyTo} onChange={(e) => setApplyTo(e.target.value as SalesCampaignScope)} className={fieldClass}>
          <option value="ALL_PRODUCTS">All Products</option>
          <option value="SPECIFIC_PRODUCTS">Specific Products</option>
          <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
        </select>
      </div>

      {applyTo === 'SPECIFIC_PRODUCTS' && (
        <div>
          <label className={labelClass}>Product IDs (comma-separated UUIDs)</label>
          <textarea value={productIdsText} onChange={(e) => setProductIdsText(e.target.value)} rows={2} className={fieldClass} placeholder="uuid1, uuid2, uuid3" />
        </div>
      )}

      {applyTo === 'SPECIFIC_CATEGORIES' && (
        <div>
          <label className={labelClass}>Category IDs (comma-separated UUIDs)</label>
          <textarea value={categoryIdsText} onChange={(e) => setCategoryIdsText(e.target.value)} rows={2} className={fieldClass} placeholder="uuid1, uuid2" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Badge Text</label>
          <input type="text" value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder='e.g. "EID SALE"' className={fieldClass} maxLength={30} />
        </div>
        <div>
          <label className={labelClass}>Priority (0–100)</label>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={0} max={100} className={fieldClass} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 transition disabled:opacity-50">
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
