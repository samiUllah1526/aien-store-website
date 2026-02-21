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
        className="fixed inset-0 bg-charcoal/40 z-40 transition-opacity duration-300"
        aria-hidden
        onClick={closeCart}
      />
      <aside
        className="fixed top-0 right-0 h-full w-full max-w-md bg-bone dark:bg-charcoal border-l border-ash/20 z-50 flex flex-col animate-fade-in rounded-l-xl"
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between p-4 border-b border-ash/20">
          <div>
            <h2 className="font-display text-xl text-soft-charcoal dark:text-off-white">Cart</h2>
            <p className="text-sm text-ash mt-0.5">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="p-2 text-soft-charcoal dark:text-off-white hover:text-ash transition-colors focus-ring rounded"
            aria-label="Close cart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="text-ash text-center py-8">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-3 pb-4 border-b border-ash/20 last:border-0"
                >
                  <img
                    src={item.image}
                    alt=""
                    className="w-20 h-20 object-cover bg-ash/20 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-soft-charcoal dark:text-off-white truncate">{item.name}</p>
                    <p className="text-sm text-ash">
                      {item.size} × {item.quantity}
                    </p>
                    <p className="text-sm text-soft-charcoal dark:text-off-white font-medium mt-1">
                      {formatMoney(item.price * item.quantity, item.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.quantity - 1)
                        }
                        className="w-7 h-7 rounded border border-ash/40 text-soft-charcoal dark:text-off-white hover:bg-ash/20 text-sm"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm text-soft-charcoal dark:text-off-white">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.size, item.quantity + 1)
                        }
                        className="w-7 h-7 rounded border border-ash/40 text-soft-charcoal dark:text-off-white hover:bg-ash/20 text-sm"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.size)}
                        className="ml-2 text-sm text-ash hover:text-soft-charcoal dark:hover:text-off-white"
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
          <div className="p-4 border-t border-ash/20 space-y-3">
            {hasMixedCurrencies ? (
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                Cart has multiple currencies. Please use one currency per order.
              </p>
            ) : (
              <p className="flex justify-between text-soft-charcoal dark:text-off-white font-display">
                <span>Subtotal</span>
                <span>{formatMoney(totalAmount, cartCurrency ?? 'PKR')}</span>
              </p>
            )}
            <p className="text-xs text-ash">
              Tax included. Shipping calculated at checkout.
            </p>
            <a
              href={hasMixedCurrencies ? '/cart' : '/checkout'}
              onClick={closeCart}
              className="block w-full py-3 text-center rounded-lg bg-soft-charcoal dark:bg-off-white text-bone dark:text-charcoal font-medium hover:opacity-90 transition-opacity text-sm focus-ring disabled:opacity-60"
            >
              {hasMixedCurrencies ? 'View cart' : 'Checkout'}
            </a>
            <a
              href="/cart"
              onClick={closeCart}
              className="block w-full py-3 text-center rounded-lg border border-soft-charcoal dark:border-off-white text-soft-charcoal dark:text-off-white font-medium hover:bg-ash/10 transition-colors text-sm focus-ring"
            >
              View cart
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
