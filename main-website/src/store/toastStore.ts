/**
 * Global toast notifications. Use showToast() to display API or UI errors/success.
 */

import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type ToastState = {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: number) => void;
};

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'error') => {
    const id = ++nextId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export function showToast(message: string, type: ToastType = 'error'): number {
  return useToastStore.getState().addToast(message, type);
}
