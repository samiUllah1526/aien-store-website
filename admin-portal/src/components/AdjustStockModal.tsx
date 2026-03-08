import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import type { Product } from '../lib/types';
import type { ProductVariant } from '../lib/types';
import { adjustStockSchema } from '../lib/validation/inventory';
import { useZodForm } from '../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../lib/forms/mapApiErrorToForm';

export interface AdjustStockProduct {
  id: string;
  name: string;
  stockQuantity: number;
  variants: ProductVariant[];
}

interface AdjustStockModalProps {
  product: AdjustStockProduct;
  onClose: () => void;
  onSuccess: (newStockQuantity: number) => void;
}

export function AdjustStockModal({ product, onClose, onSuccess }: AdjustStockModalProps) {
  const variants = product.variants ?? [];
  const form = useZodForm({
    schema: adjustStockSchema,
    defaultValues: {
      variantId: variants[0]?.id ?? '',
      quantityDelta: 0,
      reference: '',
      currentStock: variants[0]?.stockQuantity ?? product.stockQuantity,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const error = form.formState.errors.root?.serverError?.message;
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const selectedVariantId = form.watch('variantId') || '';
  const quantityDelta = form.watch('quantityDelta') ?? 0;
  const referenceTrimmed = (form.watch('reference') ?? '').trim();
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const currentStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
  const newStock = currentStock + quantityDelta;
  const wouldGoNegative = newStock < 0;
  const isZeroChange = quantityDelta === 0;
  const canSubmit =
    !submitting &&
    !isZeroChange &&
    referenceTrimmed.length > 0 &&
    !wouldGoNegative;

  useEffect(() => {
    form.setValue('currentStock', currentStock, { shouldValidate: true });
  }, [currentStock]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!canSubmit) return;
    if (values.quantityDelta < 0) {
      const ok = window.confirm(
        `You are reducing stock by ${Math.abs(values.quantityDelta)}. New total will be ${newStock}. This cannot be undone. Continue?`,
      );
      if (!ok) return;
    }
    form.clearErrors('root.serverError');
    setSubmitting(true);
    try {
      const res = await api.patch<Product>(
        `/products/${product.id}/stock`,
        { variantId: values.variantId || undefined, quantityDelta: values.quantityDelta, reference: values.reference.trim() }
      );
      const updated = res.data;
      const newStockQuantity =
        updated?.stockQuantity ?? product.stockQuantity + values.quantityDelta;
      onSuccess(newStockQuantity);
      onClose();
    } catch (err) {
      mapApiErrorToForm(err, form.setError);
    } finally {
      setSubmitting(false);
    }
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-stock-title"
      aria-describedby="adjust-stock-desc"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700"
        onClick={handleBackdropClick}
      >
        <div className="p-6" onClick={(e) => e.stopPropagation()}>
          <h2
            id="adjust-stock-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Adjust stock
          </h2>
          <p id="adjust-stock-desc" className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {product.name}
          </p>

          <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 px-4 py-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Current stock: <span className="tabular-nums">{currentStock}</span>
            </p>
            {quantityDelta !== 0 && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                After change: <span className="tabular-nums font-medium">{newStock}</span>
                {wouldGoNegative && (
                  <span className="ml-2 text-red-600 dark:text-red-400">(cannot go below zero)</span>
                )}
              </p>
            )}
          </div>

          {variants.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Variant
              </label>
              <select
                {...form.register('variantId')}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.color} / {variant.size} (stock: {variant.stockQuantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="quantity-delta" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Change amount <span className="text-slate-500">(positive = add, negative = remove)</span>
              </label>
              <input
                ref={firstInputRef}
                id="quantity-delta"
                type="number"
                value={quantityDelta === 0 ? '' : quantityDelta}
                onChange={(e) => form.setValue('quantityDelta', Number.parseInt(e.target.value || '0', 10) || 0, { shouldValidate: true })}
                placeholder="e.g. 10 or -5"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                aria-invalid={wouldGoNegative ? 'true' : undefined}
              />
            </div>

            <div>
              <label htmlFor="reference" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reference"
                {...form.register('reference')}
                placeholder="Required for audit trail (e.g. Restock from supplier, Damage write-off)"
                maxLength={500}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y"
                aria-required="true"
              />
            </div>

            {(error || form.formState.errors.quantityDelta?.message || form.formState.errors.reference?.message) && (
              <div
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"
                role="alert"
              >
                {error ?? form.formState.errors.quantityDelta?.message ?? form.formState.errors.reference?.message}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
              >
                {submitting ? 'Updating…' : 'Update stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
