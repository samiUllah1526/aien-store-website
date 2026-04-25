import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { minorUnitsToMajorString, parseMajorStringToMinorUnits } from '../lib/money';
import type { SalesCampaign, SalesCampaignFormData, SalesCampaignType, SalesCampaignScope } from '../lib/types';

function toDatetimeLocal(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function discountStateFromInitial(initial: SalesCampaign | undefined): {
  type: SalesCampaignType;
  percentValue: number;
  valuePkr: string;
} {
  if (!initial) {
    return { type: 'PERCENTAGE', percentValue: 10, valuePkr: '' };
  }
  if (initial.type === 'PERCENTAGE') {
    return { type: 'PERCENTAGE', percentValue: initial.value, valuePkr: '' };
  }
  return { type: 'FIXED_AMOUNT', percentValue: 10, valuePkr: minorUnitsToMajorString(initial.value) };
}

interface Props {
  initial?: SalesCampaign;
  onSubmit: (data: SalesCampaignFormData) => Promise<void>;
  onCancel: () => void;
}

export function SalesCampaignForm({ initial, onSubmit, onCancel }: Props) {
  const d0 = discountStateFromInitial(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<SalesCampaignType>(d0.type);
  const [percentValue, setPercentValue] = useState(d0.percentValue);
  const [valuePkr, setValuePkr] = useState(d0.valuePkr);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(initial?.endsAt));
  const [applyTo, setApplyTo] = useState<SalesCampaignScope>(initial?.applyTo ?? 'ALL_PRODUCTS');
  const [badgeText, setBadgeText] = useState(initial?.badgeText ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    (initial?.products ?? []).map((p) => p.productId),
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    (initial?.categories ?? []).map((c) => c.categoryId),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched && !initial) {
      setSlug(generateSlug(name));
    }
  }, [name, slugTouched, initial]);

  const handleDiscountTypeChange = (next: SalesCampaignType) => {
    setType(next);
    if (next === 'PERCENTAGE') {
      setPercentValue(10);
    } else {
      setValuePkr('');
    }
  };

  const fetchProducts = async ({ search, page }: { search: string; page: number }) => {
    const limit = 20;
    const r = await api.getList<{ id: string; name: string }>('/products', {
      search: search || undefined,
      page,
      limit,
    });
    const items = (r.data ?? []).map((p) => ({ id: p.id, label: p.name }));
    const total = r.meta?.total ?? 0;
    return { items, hasMore: page * limit < total };
  };

  const fetchCategories = async ({ search }: { search: string; page: number }) => {
    const r = await api.get<Array<{ id: string; name: string }>>('/categories', search ? { search } : undefined);
    const items = (r.data ?? []).map((c) => ({ id: c.id, label: c.name }));
    return { items, hasMore: false };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Name is required'); return; }
    if (!startsAt) { setError('Start date is required'); return; }
    if (!endsAt) { setError('End date is required'); return; }
    if (new Date(endsAt) <= new Date(startsAt)) { setError('End date must be after start date'); return; }

    let valueUnits: number;
    if (type === 'PERCENTAGE') {
      if (percentValue < 1 || percentValue > 100) { setError('Percentage must be 1–100'); return; }
      valueUnits = Math.round(percentValue);
    } else {
      const minor = parseMajorStringToMinorUnits(valuePkr);
      if (Number.isNaN(minor)) { setError('Enter a valid amount in PKR'); return; }
      if (minor < 1) { setError('Amount off must be at least 0.01 PKR'); return; }
      valueUnits = minor;
    }

    if (applyTo === 'SPECIFIC_PRODUCTS' && selectedProductIds.length === 0) { setError('Select at least one product'); return; }
    if (applyTo === 'SPECIFIC_CATEGORIES' && selectedCategoryIds.length === 0) { setError('Select at least one category'); return; }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        type,
        value: valueUnits,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        applyTo,
        badgeText: badgeText.trim() || undefined,
        priority,
        productIds: applyTo === 'SPECIFIC_PRODUCTS' ? selectedProductIds : undefined,
        categoryIds: applyTo === 'SPECIFIC_CATEGORIES' ? selectedCategoryIds : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Campaign Name <span className="text-red-500">*</span>
        </label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Eid Sale 2026" className={inputClass} maxLength={100} required />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Slug
        </label>
        <input
          type="text"
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
          placeholder="auto-generated-from-name"
          className={inputClass}
          maxLength={120}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Auto-generated from name. Edit to customise.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Description
        </label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} maxLength={500} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Discount Type <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => handleDiscountTypeChange(e.target.value as SalesCampaignType)}
            className={inputClass}
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED_AMOUNT">Fixed amount off</option>
          </select>
        </div>
        <div>
          {type === 'PERCENTAGE' ? (
            <>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Value <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={percentValue}
                  onChange={(e) => setPercentValue(Number(e.target.value))}
                  min={1}
                  max={100}
                  className={inputClass}
                  required
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">%</span>
              </div>
            </>
          ) : (
            <>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Amount off (PKR) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={valuePkr}
                  onChange={(e) => setValuePkr(e.target.value)}
                  placeholder="e.g. 500"
                  className={inputClass}
                  required
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">PKR</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Starts At <span className="text-red-500">*</span>
          </label>
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Ends At <span className="text-red-500">*</span>
          </label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} required />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Apply To <span className="text-red-500">*</span>
        </label>
        <select value={applyTo} onChange={(e) => setApplyTo(e.target.value as SalesCampaignScope)} className={inputClass}>
          <option value="ALL_PRODUCTS">All products</option>
          <option value="SPECIFIC_PRODUCTS">Specific products</option>
          <option value="SPECIFIC_CATEGORIES">Specific categories</option>
        </select>
      </div>

      {applyTo === 'SPECIFIC_PRODUCTS' && (
        <SearchableMultiSelect
          label="Products"
          placeholder="Search products…"
          emptyMessage="No products"
          selectedIds={selectedProductIds}
          onSelectedIdsChange={setSelectedProductIds}
          fetchItems={fetchProducts}
        />
      )}

      {applyTo === 'SPECIFIC_CATEGORIES' && (
        <SearchableMultiSelect
          label="Categories"
          placeholder="Search categories…"
          emptyMessage="No categories"
          selectedIds={selectedCategoryIds}
          onSelectedIdsChange={setSelectedCategoryIds}
          fetchItems={fetchCategories}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Badge Text
          </label>
          <input type="text" value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder='e.g. "EID SALE"' className={inputClass} maxLength={30} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Priority (0–100)
          </label>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={0} max={100} className={inputClass} />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-600 dark:hover:bg-slate-500"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
