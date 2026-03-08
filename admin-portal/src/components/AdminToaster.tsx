/**
 * Renders react-hot-toast Toaster (portals to body) and registers global
 * toast helpers so the API layer and any component can show toasts.
 * Mounted in layout so toasts are always visible regardless of scroll.
 */

import { useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';

declare global {
  interface Window {
    __adminToast?: {
      success: (message: string) => void;
      error: (message: string) => void;
    };
  }
}

export function AdminToaster() {
  useEffect(() => {
    window.__adminToast = {
      success: (message: string) => toast.success(message),
      error: (message: string) => toast.error(message),
    };
    return () => {
      delete window.__adminToast;
    };
  }, []);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
      }}
      containerStyle={{
        zIndex: 99999,
      }}
    />
  );
}
