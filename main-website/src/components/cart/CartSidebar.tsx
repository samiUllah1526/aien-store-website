/**
 * Cart sidebar: minimal list of items, quantities, remove, and link to checkout.
 * Rendered as overlay; cart state from CartProvider.
 */

import { useEffect } from 'react';
import { useCart } from '../../store/cartStore';
import { formatMoney } from '../../lib/formatMoney';

export default function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, totalAmount, cartCurrency, hasMixedCurrencies } =
    useCart();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-ink/40 z-40 transition-opacity duration-300"
        aria-hidden
        onClick={closeCart}
      />
      <aside
        className="fixed top-0 right-0 h-full w-full max-w-md bg-cream dark:bg-ink border-l border-sand dark:border-charcoal-light shadow-soft-lg z-50 flex flex-col animate-fade-in"
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between p-4 border-b border-sand dark:border-charcoal-light">
          <div>
            <h2 className="font-display text-xl text-ink dark:text-cream">Shopping Cart</h2>
            <p className="text-sm text-charcoal/70 dark:text-cream/70 mt-0.5">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="p-2 text-charcoal dark:text-cream hover:text-emerald transition-colors focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink rounded"
            aria-label="Close cart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-charcoal/70 dark:text-cream/70 text-center py-8">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-3 pb-4 border-b border-sand/60 dark:border-charcoal-light/60 last:border-0"
                >
                  <img
                    src={item.image}
                    alt=""
                    className="w-20 h-20 object-cover bg-sand rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink dark:text-cream truncate">{item.name}</p>
                    <p className="text-sm text-charcoal/70 dark:text-cream/70">
                      {item.size} × {item.quantity}
                    </p>
                    <p className="text-sm text-emerald font-medium mt-1">
                      {formatMoney(item.price * item.quantity, item.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded border border-sand dark:border-charcoal-light text-charcoal dark:text-cream hover:bg-sand dark:hover:bg-charcoal-light text-sm"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm text-charcoal dark:text-cream">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.quantity + 1)
                        }
                        className="w-7 h-7 rounded border border-sand dark:border-charcoal-light text-charcoal dark:text-cream hover:bg-sand dark:hover:bg-charcoal-light text-sm"
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
          )}
        </div>
        {items.length > 0 && (
          <div className="p-4 border-t border-sand dark:border-charcoal-light space-y-3">
            {hasMixedCurrencies ? (
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                Cart has multiple currencies. Please use one currency per order.
              </p>
            ) : (
              <p className="flex justify-between text-ink dark:text-cream font-display">
                <span>Subtotal</span>
                <span>{formatMoney(totalAmount, cartCurrency ?? 'PKR')}</span>
              </p>
            )}
            <p className="text-xs text-charcoal/70 dark:text-cream/70">
              Tax included. Shipping calculated at checkout.
            </p>
            <a
              href={hasMixedCurrencies ? '/cart' : '/checkout'}
              onClick={closeCart}
              className="block w-full py-3 text-center bg-ink dark:bg-cream text-cream dark:text-ink font-medium rounded-lg hover:opacity-90 transition-opacity uppercase tracking-wide text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink disabled:opacity-60"
            >
              {hasMixedCurrencies ? 'View cart' : 'Checkout'}
            </a>
            <a
              href="/cart"
              onClick={closeCart}
              className="block w-full py-3 text-center border border-ink dark:border-cream text-ink dark:text-cream font-medium rounded-lg hover:bg-sand dark:hover:bg-charcoal-light transition-colors uppercase tracking-wide text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            >
              View cart
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
