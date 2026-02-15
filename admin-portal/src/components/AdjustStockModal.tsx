import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import type { Product } from '../lib/types';

export interface AdjustStockProduct {
  id: string;
  name: string;
  stockQuantity: number;
}

interface AdjustStockModalProps {
  product: AdjustStockProduct;
  onClose: () => void;
  onSuccess: (newStockQuantity: number) => void;
}

export function AdjustStockModal({ product, onClose, onSuccess }: AdjustStockModalProps) {
  const [quantityDelta, setQuantityDelta] = useState<number>(0);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const newStock = product.stockQuantity + quantityDelta;
  const wouldGoNegative = newStock < 0;
  const isZeroChange = quantityDelta === 0;
  const referenceTrimmed = reference.trim();
  const canSubmit =
    !submitting &&
    !isZeroChange &&
    referenceTrimmed.length > 0 &&
    !wouldGoNegative;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (quantityDelta < 0) {
      const ok = window.confirm(
        `You are reducing stock by ${Math.abs(quantityDelta)}. New total will be ${newStock}. This cannot be undone. Continue?`,
      );
      if (!ok) return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.patch<Product>(
        `/products/${product.id}/stock`,
        { quantityDelta, reference: referenceTrimmed }
      );
      const updated = res.data;
      const newStockQuantity =
        updated?.stockQuantity ?? product.stockQuantity + quantityDelta;
      onSuccess(newStockQuantity);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

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
              Current stock: <span className="tabular-nums">{product.stockQuantity}</span>
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
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || v === '-') {
                    setQuantityDelta(0);
                    return;
                  }
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n)) setQuantityDelta(n);
                }}
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
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Required for audit trail (e.g. Restock from supplier, Damage write-off)"
                maxLength={500}
                rows={3}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-y"
                aria-required="true"
              />
            </div>

            {error && (
              <div
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"
                role="alert"
              >
                {error}
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
