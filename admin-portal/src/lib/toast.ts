/**
 * Global toast helpers for admin portal.
 * Set by AdminToaster on mount; use in API layer and components.
 */

declare global {
  interface Window {
    __adminToast?: {
      success: (message: string) => void;
      error: (message: string) => void;
    };
  }
}

export function toastError(message: string): void {
  if (typeof window !== 'undefined' && window.__adminToast) window.__adminToast.error(message);
}

export function toastSuccess(message: string): void {
  if (typeof window !== 'undefined' && window.__adminToast) window.__adminToast.success(message);
}
