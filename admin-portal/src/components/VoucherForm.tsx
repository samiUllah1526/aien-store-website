import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { api } from '../lib/api';
import type { Voucher, VoucherFormData } from '../lib/types';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { useZodForm } from '../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../lib/forms/mapApiErrorToForm';
import { voucherFormSchema } from '../lib/validation/voucher';

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
  const form = useZodForm({
    schema: voucherFormSchema,
    defaultValues: {
      code: voucher?.code ?? '',
      type: voucher?.type ?? 'PERCENTAGE',
      value: voucher ? (voucher.type === 'FIXED_AMOUNT' ? String(Math.floor(voucher.value / 100)) : String(voucher.value)) : '',
      minOrderValuePkr: voucher ? String(Math.floor(voucher.minOrderValueCents / 100)) : '',
      maxDiscountPkr: voucher?.maxDiscountCents != null ? String(Math.floor(voucher.maxDiscountCents / 100)) : '',
      startDate: voucher?.startDate ? voucher.startDate.slice(0, 16) : '',
      expiryDate: voucher?.expiryDate ? voucher.expiryDate.slice(0, 16) : '',
      usageLimitGlobal: voucher?.usageLimitGlobal != null ? String(voucher.usageLimitGlobal) : '',
      usageLimitPerUser: voucher?.usageLimitPerUser != null ? String(voucher.usageLimitPerUser) : '',
      applicableProductIds: voucher?.applicableProductIds ?? [],
      applicableCategoryIds: voucher?.applicableCategoryIds ?? [],
      isActive: voucher?.isActive ?? true,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const error = form.formState.errors.root?.serverError?.message;
  const type = form.watch('type');

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
    form.setValue('code', generateCode(), { shouldValidate: true });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root.serverError');
    setSubmitting(true);
    try {
      const val = Number.parseInt(values.value || '0', 10);
      const start = values.startDate ? new Date(values.startDate) : new Date();
      const expiry = values.expiryDate ? new Date(values.expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await onSubmit({
        code: values.code.trim().toUpperCase(),
        type: values.type,
        value: values.type === 'PERCENTAGE' ? val : values.type === 'FIXED_AMOUNT' ? val * 100 : 0,
        minOrderValueCents: values.minOrderValuePkr ? Number.parseInt(values.minOrderValuePkr, 10) * 100 : 0,
        maxDiscountCents: values.maxDiscountPkr ? Number.parseInt(values.maxDiscountPkr, 10) * 100 : undefined,
        startDate: start.toISOString(),
        expiryDate: expiry.toISOString(),
        usageLimitGlobal: values.usageLimitGlobal ? Number.parseInt(values.usageLimitGlobal, 10) : undefined,
        usageLimitPerUser: values.usageLimitPerUser ? Number.parseInt(values.usageLimitPerUser, 10) : undefined,
        applicableProductIds: values.applicableProductIds.length ? values.applicableProductIds : undefined,
        applicableCategoryIds: values.applicableCategoryIds.length ? values.applicableCategoryIds : undefined,
        isActive: values.isActive,
      });
    } catch (err) {
      mapApiErrorToForm(err, form.setError);
    } finally {
      setSubmitting(false);
    }
  });

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
            {...form.register('code')}
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
          {...form.register('type')}
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
              {...form.register('value')}
              placeholder={type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'}
              className={inputClass}
              required
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
          {...form.register('minOrderValuePkr')}
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
            {...form.register('maxDiscountPkr')}
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
            {...form.register('startDate')}
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
            {...form.register('expiryDate')}
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
            {...form.register('usageLimitGlobal')}
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
            {...form.register('usageLimitPerUser')}
            placeholder="Unlimited"
            className={inputClass}
          />
        </div>
      </div>
      <Controller
        control={form.control}
        name="applicableCategoryIds"
        render={({ field }) => (
          <SearchableMultiSelect
            label="Eligible categories (empty = all)"
            placeholder="Search categories…"
            emptyMessage="No categories"
            selectedIds={field.value}
            onSelectedIdsChange={field.onChange}
            fetchItems={fetchCategories}
          />
        )}
      />
      <Controller
        control={form.control}
        name="applicableProductIds"
        render={({ field }) => (
          <SearchableMultiSelect
            label="Eligible products (empty = all)"
            placeholder="Search products…"
            emptyMessage="No products"
            selectedIds={field.value}
            onSelectedIdsChange={field.onChange}
            fetchItems={fetchProducts}
          />
        )}
      />
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...form.register('isActive')}
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
