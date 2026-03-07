import { useEffect } from 'react';
import { useToastStore } from '../store/toastStore';

const AUTO_DISMISS_MS = 5000;

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-[100] flex flex-col gap-2 w-full max-w-[calc(100%-2rem)] sm:max-w-sm pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: { id: number; message: string; type: 'error' | 'success' | 'info' };
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const styles = {
    error: 'bg-red-600 text-white border-red-700 shadow-lg',
    success: 'bg-emerald-700 text-white border-emerald-800 shadow-lg',
    info: 'bg-ink dark:bg-charcoal-light text-cream border-charcoal shadow-lg',
  };

  return (
    <div
      className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm ${styles[toast.type]}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex-1">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity -m-2"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
