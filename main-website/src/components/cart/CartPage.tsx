/**
 * Editorial AIEN shopping bag page.
 *
 * Two-column layout:
 *   - Left: large product rows (image + meta + quantity stepper + remove).
 *   - Right (sticky): order summary with subtotal / shipping / estimated tax /
 *     total + primary "Proceed to Checkout" CTA and supporting service notes.
 *
 * Uses the existing Zustand cart store and store helpers — no behaviour
 * changes; styling and structure only.
 */

import { useState, useEffect } from 'react';
import { useCart, useCartStore, MAX_CART_QUANTITY } from '../../store/cartStore';
import { formatMoney } from '../../lib/formatMoney';
import ColorSwatch from '../product/ColorSwatch';
import { buildImageUrl, IMAGE_PRESETS } from '../../lib/buildImageUrl';
import { colorAriaLabel, colorUiLabel } from '../../lib/colorDisplay';

const ESTIMATED_TAX_RATE = 0.08;

export default function CartPage() {
  const {
    items,
    removeItem,
    updateQuantity,
    totalAmount,
    cartCurrency,
    hasMixedCurrencies,
  } = useCart();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHasHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  if (!hasHydrated) {
    return (
      <div className="py-24 text-center text-on-surface-variant font-body-md">
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-h3-section text-on-background mb-6">
          Your shopping bag is empty.
        </p>
        <a href="/shop" className="link-underline">
          Continue Shopping
        </a>
      </div>
    );
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const currency = cartCurrency ?? 'PKR';
  const subtotal = totalAmount;
  const estimatedTax = Math.round(subtotal * ESTIMATED_TAX_RATE);
  const total = subtotal + estimatedTax;

  return (
    <div>
      <header className="mb-16 md:mb-20">
        <h1 className="font-serif text-h1-display text-on-background uppercase">Shopping Bag</h1>
        <p className="font-sans text-label-caps text-on-surface-variant mt-4">
          {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'} IN YOUR SELECTION
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
        {/* Items list */}
        <ul className="flex-grow w-full lg:w-2/3 divide-y divide-outline-variant">
          {items.map((item) => (
            <li key={item.variantId} className="flex flex-col sm:flex-row gap-6 sm:gap-8 py-8">
              <a
                href={`/shop/${item.slug}`}
                className="block w-full sm:w-48 h-64 bg-surface-container-low overflow-hidden group flex-shrink-0"
              >
                {item.image ? (
                  <img
                    src={buildImageUrl(item.image, IMAGE_PRESETS.cartItem)}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined" aria-hidden>image</span>
                  </div>
                )}
              </a>
              <div className="flex-grow flex flex-col justify-between py-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <a href={`/shop/${item.slug}`} className="block">
                      <h3 className="font-serif text-h3-section text-on-background tracking-tight">
                        {item.name}
                      </h3>
                    </a>
                    <p className="font-sans text-label-caps text-on-surface-variant mt-2 inline-flex items-center gap-2 uppercase">
                      <ColorSwatch color={item.color} size="sm" aria-label={colorAriaLabel(item.color)} />
                      <span>
                        {colorUiLabel(item.color)} / Size {item.size}
                      </span>
                    </p>
                  </div>
                  <span className="font-body-lg text-on-background shrink-0">
                    {formatMoney(item.price * item.quantity, item.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-end gap-4 mt-6">
                  <div className="flex items-center gap-6 border border-outline-variant px-4 py-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="hover:text-secondary transition-colors disabled:opacity-40"
                      aria-label="Decrease quantity"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden>remove</span>
                    </button>
                    <span className="font-sans text-label-caps min-w-[1.5rem] text-center">
                      {String(item.quantity).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.variantId, Math.min(item.quantity + 1, MAX_CART_QUANTITY))
                      }
                      disabled={item.quantity >= MAX_CART_QUANTITY}
                      className="hover:text-secondary transition-colors disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden>add</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="font-sans text-label-caps text-on-surface-variant hover:text-on-background transition-colors border-b border-transparent hover:border-on-background pb-1"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Sticky summary */}
        <aside className="w-full lg:w-1/3 bg-surface-container-low p-8 md:p-12 lg:sticky lg:top-28">
          <h2 className="font-serif text-h3-section text-on-background uppercase mb-12">
            Summary
          </h2>

          {hasMixedCurrencies && (
            <p className="font-body-md text-error mb-6">
              Cart has multiple currencies. Please use one currency per order.
            </p>
          )}

          <div className="space-y-6 mb-12">
            <div className="flex justify-between items-center">
              <span className="font-sans text-label-caps text-on-surface-variant">SUBTOTAL</span>
              <span className="font-body-md text-on-background">
                {formatMoney(subtotal, currency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-label-caps text-on-surface-variant">SHIPPING</span>
              <span className="font-sans text-label-caps text-secondary uppercase">
                Calculated at checkout
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans text-label-caps text-on-surface-variant">
                ESTIMATED TAX
              </span>
              <span className="font-body-md text-on-background">
                {formatMoney(estimatedTax, currency)}
              </span>
            </div>
          </div>

          <div className="border-t border-outline-variant pt-8 mb-12 flex justify-between items-baseline">
            <span className="font-sans text-label-caps text-on-background">TOTAL</span>
            <span className="font-serif text-h2-editorial text-on-background tracking-tight leading-none">
              {formatMoney(total, currency)}
            </span>
          </div>

          <a
            href="/checkout"
            aria-disabled={hasMixedCurrencies}
            className={`block w-full bg-primary text-on-primary py-6 font-sans text-button uppercase tracking-widest text-center hover:bg-secondary transition-all duration-300 active:scale-[0.99] mb-6 ${
              hasMixedCurrencies ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            Proceed to Checkout
          </a>

          <a
            href="/shop"
            className="block w-full text-center border border-primary text-primary py-4 font-sans text-button uppercase tracking-widest hover:bg-surface-container transition-colors mb-8"
          >
            Continue Shopping
          </a>

          <div className="space-y-4">
            <div className="flex gap-4 items-start text-on-surface-variant">
              <span className="material-symbols-outlined text-lg" aria-hidden>
                local_shipping
              </span>
              <p className="font-sans text-label-caps leading-relaxed">
                Complimentary climate-neutral delivery on qualifying orders.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
