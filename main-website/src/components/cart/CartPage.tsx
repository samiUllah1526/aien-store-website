/**
 * Cart page content: list items from context, link to checkout.
 * Mirrors CartSidebar list but as full page.
 */

import { useState, useEffect } from 'react';
import { useCart, useCartStore } from '../../store/cartStore';
import { formatMoney } from '../../lib/formatMoney';

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalItems, totalAmount, cartCurrency, hasMixedCurrencies } = useCart();
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHasHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  if (!hasHydrated) {
    return <div className="py-12 text-center text-charcoal/70 dark:text-cream/70">Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-charcoal/70 dark:text-cream/70">
        <p>Your cart is empty.</p>
        <a href="/shop" className="mt-4 inline-block text-emerald hover:text-emerald-light font-medium">
          Continue shopping
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-sand dark:divide-charcoal-light">
        {items.map((item) => (
          <li key={`${item.productId}-${item.size}`} className="py-6 flex gap-4">
            <img
              src={item.image}
              alt=""
              className="w-24 h-24 object-cover bg-sand dark:bg-charcoal-light rounded shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-ink dark:text-cream">{item.name}</p>
              <p className="text-sm text-charcoal/70 dark:text-cream/70">
                {item.size} × {item.quantity} — {formatMoney(item.price * item.quantity, item.currency)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                  className="w-8 h-8 rounded border border-sand dark:border-charcoal-light text-charcoal dark:text-cream hover:bg-sand dark:hover:bg-charcoal-light text-sm"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm text-charcoal dark:text-cream">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                  className="w-8 h-8 rounded border border-sand dark:border-charcoal-light text-charcoal dark:text-cream hover:bg-sand dark:hover:bg-charcoal-light text-sm"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.size)}
                  className="ml-2 text-sm text-charcoal/70 dark:text-cream/70 hover:text-emerald"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-sand dark:border-charcoal-light pt-6 space-y-2">
        {hasMixedCurrencies ? (
          <p className="text-amber-700 dark:text-amber-400 text-sm">
            Cart has multiple currencies. Please use one currency per order.
          </p>
        ) : (
          <p className="flex justify-between text-charcoal dark:text-cream">
            <span>Subtotal</span>
            <span>{formatMoney(totalAmount, cartCurrency ?? 'PKR')}</span>
          </p>
        )}
        <p className="text-sm text-charcoal/70 dark:text-cream/70">
          Tax included. Shipping calculated at checkout.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="/checkout"
          className={hasMixedCurrencies ? 'pointer-events-none opacity-60' : ''}
          aria-disabled={hasMixedCurrencies}
          className="flex-1 py-3 text-center bg-ink dark:bg-cream text-cream dark:text-ink font-medium rounded-lg hover:opacity-90 transition-opacity uppercase tracking-wide text-sm"
        >
          Checkout
        </a>
        <a
          href="/shop"
          className="flex-1 py-3 text-center border border-ink dark:border-cream text-ink dark:text-cream font-medium rounded-lg hover:bg-sand dark:hover:bg-charcoal-light transition-colors uppercase tracking-wide text-sm"
        >
          Continue shopping
        </a>
      </div>
    </div>
  );
}
