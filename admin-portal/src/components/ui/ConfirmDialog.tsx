import { useState } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  /** Require user to type this (case-insensitive) to enable Confirm. */
  confirmKeyword?: string;
  /** Label for the keyword input, e.g. "Type PROMOTE to confirm" */
  confirmKeywordLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  /** Error message to show (e.g. API failure) */
  error?: string | null;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  confirmKeyword,
  confirmKeywordLabel,
  onConfirm,
  onCancel,
  loading = false,
  error,
}: ConfirmDialogProps) {
  const [keywordValue, setKeywordValue] = useState('');
  if (!open) return null;
  const isDanger = variant === 'danger';
  const keywordMatch = !confirmKeyword || keywordValue.trim().toUpperCase() === confirmKeyword.trim().toUpperCase();
  const confirmDisabled = loading || (confirmKeyword ? !keywordMatch : false);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    void Promise.resolve(onConfirm()).then(() => setKeywordValue(''));
  };

  const handleCancel = () => {
    setKeywordValue('');
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl dark:border dark:border-slate-700 dark:bg-slate-800 p-6">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{message}</p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300" role="alert">
            {error}
          </p>
        )}
        {confirmKeyword && confirmKeywordLabel && (
          <div className="mb-4">
            <label htmlFor="confirm-keyword" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {confirmKeywordLabel}
            </label>
            <input
              id="confirm-keyword"
              type="text"
              value={keywordValue}
              onChange={(e) => setKeywordValue(e.target.value)}
              placeholder={confirmKeyword}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              autoComplete="off"
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500'
            }`}
          >
            {loading ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
