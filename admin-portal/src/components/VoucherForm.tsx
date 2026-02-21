import { useState } from 'react';
import { api } from '../lib/api';
import type { Voucher, VoucherFormData } from '../lib/types';
import { SearchableMultiSelect } from './SearchableMultiSelect';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const VOUCHER_TYPES = [
  { value: 'PERCENTAGE' as const, label: 'Percentage off' },
  { value: 'FIXED_AMOUNT' as const, label: 'Fixed amount off' },
  { value: 'FREE_SHIPPING' as const, label: 'Free shipping' },
];

interface VoucherFormProps {
  voucher?: Voucher | null;
  onSubmit: (data: VoucherFormData) => Promise<void>;
  onCancel: () => void;
}

export function VoucherForm({ voucher, onSubmit, onCancel }: VoucherFormProps) {
  const [code, setCode] = useState(voucher?.code ?? '');
  const [type, setType] = useState<VoucherFormData['type']>(voucher?.type ?? 'PERCENTAGE');
  const [value, setValue] = useState(
    voucher ? (voucher.type === 'FIXED_AMOUNT' ? String(Math.floor(voucher.value / 100)) : String(voucher.value)) : ''
  );
  const [minOrderValueCents, setMinOrderValueCents] = useState(
    voucher ? String(Math.floor(voucher.minOrderValueCents / 100)) : ''
  );
  const [maxDiscountCents, setMaxDiscountCents] = useState(
    voucher?.maxDiscountCents != null ? String(Math.floor(voucher.maxDiscountCents / 100)) : ''
  );
  const [startDate, setStartDate] = useState(
    voucher?.startDate ? voucher.startDate.slice(0, 16) : ''
  );
  const [expiryDate, setExpiryDate] = useState(
    voucher?.expiryDate ? voucher.expiryDate.slice(0, 16) : ''
  );
  const [usageLimitGlobal, setUsageLimitGlobal] = useState(
    voucher?.usageLimitGlobal != null ? String(voucher.usageLimitGlobal) : ''
  );
  const [usageLimitPerUser, setUsageLimitPerUser] = useState(
    voucher?.usageLimitPerUser != null ? String(voucher.usageLimitPerUser) : ''
  );
  const [applicableProductIds, setApplicableProductIds] = useState<string[]>(
    voucher?.applicableProductIds ?? []
  );
  const [applicableCategoryIds, setApplicableCategoryIds] = useState<string[]>(
    voucher?.applicableCategoryIds ?? []
  );
  const [isActive, setIsActive] = useState(voucher?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async ({ search, page }: { search: string; page: number }) => {
    const r = await api.get<Array<{ id: string; name: string }>>('/categories', search ? { search } : undefined);
    const items = (r.data ?? []).map((c) => ({ id: c.id, label: c.name }));
    return { items, hasMore: false };
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

  const handleGenerateCode = () => {
    setCode(generateCode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const val = parseInt(value, 10);
      if (Number.isNaN(val) || val < 0) {
        setError('Value must be a positive number');
        return;
      }
      if (type === 'PERCENTAGE' && (val < 1 || val > 100)) {
        setError('Percentage must be between 1 and 100');
        return;
      }
      if (type === 'FIXED_AMOUNT' && val < 1) {
        setError('Fixed amount must be positive');
        return;
      }
      const start = startDate ? new Date(startDate) : new Date();
      const expiry = expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (expiry <= start) {
        setError('Expiry date must be after start date');
        return;
      }
      await onSubmit({
        code: code.trim().toUpperCase(),
        type,
        value: type === 'PERCENTAGE' ? val : type === 'FIXED_AMOUNT' ? val * 100 : 0,
        minOrderValueCents: minOrderValueCents ? parseInt(minOrderValueCents, 10) * 100 : 0,
        maxDiscountCents: maxDiscountCents ? parseInt(maxDiscountCents, 10) * 100 : undefined,
        startDate: start.toISOString(),
        expiryDate: expiry.toISOString(),
        usageLimitGlobal: usageLimitGlobal ? parseInt(usageLimitGlobal, 10) : undefined,
        usageLimitPerUser: usageLimitPerUser ? parseInt(usageLimitPerUser, 10) : undefined,
        applicableProductIds: applicableProductIds.length ? applicableProductIds : undefined,
        applicableCategoryIds: applicableCategoryIds.length ? applicableCategoryIds : undefined,
        isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Code <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER20"
            className={inputClass}
            required
          />
          <button
            type="button"
            onClick={handleGenerateCode}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Generate
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Type <span className="text-red-500">*</span>
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as VoucherFormData['type'])}
          className={inputClass}
        >
          {VOUCHER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      {type !== 'FREE_SHIPPING' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Value <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={type === 'PERCENTAGE' ? 1 : 1}
              max={type === 'PERCENTAGE' ? 100 : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'}
              className={inputClass}
              required={type !== 'FREE_SHIPPING'}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {type === 'PERCENTAGE' ? '%' : 'PKR'}
            </span>
          </div>
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Min order value (PKR)
        </label>
        <input
          type="number"
          min="0"
          value={minOrderValueCents}
          onChange={(e) => setMinOrderValueCents(e.target.value)}
          placeholder="0"
          className={inputClass}
        />
      </div>
      {type === 'PERCENTAGE' && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Max discount cap (PKR)
          </label>
          <input
            type="number"
            min="0"
            value={maxDiscountCents}
            onChange={(e) => setMaxDiscountCents(e.target.value)}
            placeholder="No cap"
            className={inputClass}
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Start date <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Expiry date <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Usage limit (global)
          </label>
          <input
            type="number"
            min="1"
            value={usageLimitGlobal}
            onChange={(e) => setUsageLimitGlobal(e.target.value)}
            placeholder="Unlimited"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Usage limit (per user)
          </label>
          <input
            type="number"
            min="1"
            value={usageLimitPerUser}
            onChange={(e) => setUsageLimitPerUser(e.target.value)}
            placeholder="Unlimited"
            className={inputClass}
          />
        </div>
      </div>
      <SearchableMultiSelect
        label="Eligible categories (empty = all)"
        placeholder="Search categories…"
        emptyMessage="No categories"
        selectedIds={applicableCategoryIds}
        onSelectedIdsChange={setApplicableCategoryIds}
        fetchItems={fetchCategories}
      />
      <SearchableMultiSelect
        label="Eligible products (empty = all)"
        placeholder="Search products…"
        emptyMessage="No products"
        selectedIds={applicableProductIds}
        onSelectedIdsChange={setApplicableProductIds}
        fetchItems={fetchProducts}
      />
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-slate-800 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Active
          </span>
        </label>
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
