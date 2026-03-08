/**
 * Global cart store (Zustand) so cart state is shared across Astro islands.
 * Persisted to localStorage so cart survives full-page navigation (e.g. to /checkout).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Maximum quantity per line item in cart. Enforced in UI and should match backend cap. */
export const MAX_CART_QUANTITY = 99;

export type CartItem = {
  productId: string;
  variantId: string;
  color: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  image: string;
  size: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
  addItem: (item) =>
    set((state) => {
      const qty = Math.min(item.quantity ?? 1, MAX_CART_QUANTITY);
      const existing = state.items.find(
        (i) => i.variantId === item.variantId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === item.variantId
              ? { ...i, quantity: Math.min(i.quantity + qty, MAX_CART_QUANTITY) }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: qty }] };
    }),
  removeItem: (variantId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => i.variantId !== variantId
      ),
    })),
  updateQuantity: (variantId, quantity) =>
    set((state) => {
      const capped = Math.min(Math.max(0, quantity), MAX_CART_QUANTITY);
      if (capped <= 0) {
        return {
          items: state.items.filter(
            (i) => i.variantId !== variantId
          ),
        };
      }
      return {
        items: state.items.map((i) =>
          i.variantId === variantId ? { ...i, quantity: capped } : i
        ),
      };
    }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: 'adab-cart',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as { items?: Array<Partial<CartItem>> } | undefined;
        const items = (state?.items ?? []).filter(
          (item): item is CartItem =>
            typeof item.productId === 'string' &&
            typeof item.variantId === 'string' &&
            typeof item.color === 'string' &&
            typeof item.size === 'string' &&
            typeof item.name === 'string' &&
            typeof item.slug === 'string' &&
            typeof item.currency === 'string' &&
            typeof item.image === 'string' &&
            typeof item.price === 'number' &&
            typeof item.quantity === 'number',
        );
        return { items, isOpen: false };
      },
      partialize: (state) => ({ items: state.items }),
    }
  )
);

/** Single currency shared by all cart items, or null if mixed. */
export function getCartCurrency(items: CartItem[]): string | null {
  if (items.length === 0) return null;
  const first = items[0].currency;
  return items.every((i) => i.currency === first) ? first : null;
}

export function useCart() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const openCart = useCartStore((s) => s.openCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const cartCurrency = getCartCurrency(items);
  const hasMixedCurrencies = items.length > 1 && cartCurrency === null;
  const totalAmount = hasMixedCurrencies ? 0 : items.reduce((s, i) => s + i.price * i.quantity, 0);
  return {
    items,
    isOpen,
    totalItems,
    totalAmount,
    cartCurrency,
    hasMixedCurrencies,
    addItem,
    removeItem,
    updateQuantity,
    openCart,
    closeCart,
    toggleCart,
  };
}
