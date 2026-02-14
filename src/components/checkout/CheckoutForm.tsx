/**
 * Production-style checkout: Contact, Delivery, Shipping, Payment.
 * Two-column layout (form left, order summary right). COD + Bank Transfer with dummy bank details.
 */

import { useState, useEffect } from 'react';
import { useCart, useCartStore } from '../../store/cartStore';

const SHIPPING_COST = 299;

export default function CheckoutForm() {
  const { items, totalAmount } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>('cod');
  const [saveInfo, setSaveInfo] = useState(false);

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHasHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  const subtotal = totalAmount;
  const total = subtotal + SHIPPING_COST;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (!hasHydrated) {
    return (
      <div className="py-12 text-center text-charcoal/70 dark:text-cream/70">Loading…</div>
    );
  }

  if (items.length === 0 && !submitted) {
    return (
      <div className="py-12 text-center text-charcoal/70 dark:text-cream/70">
        <p>Your cart is empty.</p>
        <a
          href="/shop"
          className="mt-4 inline-block text-emerald hover:text-emerald-light font-medium"
        >
          Continue shopping
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-12 text-center max-w-md mx-auto">
        <p className="font-display text-xl text-ink dark:text-cream">Thank you.</p>
        <p className="mt-2 text-charcoal/80 dark:text-cream/80">
          This is a UI-only demo. No order was placed.
        </p>
        <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70">
          Payment method: {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Transfer'}
        </p>
        <a
          href="/shop"
          className="mt-6 inline-block text-emerald hover:text-emerald-light font-medium"
        >
          Back to shop
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-12 xl:gap-16">
      {/* Left: form sections */}
      <div className="space-y-10">
        {/* Contact */}
        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Contact</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              placeholder="Email or mobile phone number"
              className="flex-1 rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            />
            <a
              href="#"
              className="text-sm text-emerald hover:text-emerald-light self-center sm:self-auto"
            >
              Sign in
            </a>
          </div>
        </section>

        {/* Delivery */}
        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Delivery</h2>
          <div className="space-y-3">
            <select
              required
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            >
              <option value="PK">Pakistan</option>
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="First name"
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
              <input
                type="text"
                required
                placeholder="Last name"
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
            </div>
            <input
              type="text"
              required
              placeholder="Address"
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            />
            <input
              type="text"
              placeholder="Apartment, suite, etc. (optional)"
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="City"
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
              <input
                type="text"
                placeholder="Postal code (optional)"
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
            </div>
            <input
              type="tel"
              required
              placeholder="Phone"
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            />
            <label className="flex items-center gap-2 text-sm text-charcoal dark:text-cream/90 cursor-pointer">
              <input
                type="checkbox"
                checked={saveInfo}
                onChange={(e) => setSaveInfo(e.target.checked)}
                className="rounded border-sand dark:border-charcoal-light text-emerald focus:ring-emerald/50"
              />
              Save this information for next time
            </label>
          </div>
        </section>

        {/* Shipping method */}
        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Shipping method</h2>
          <label className="flex items-center justify-between rounded-lg border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-4 py-3 cursor-pointer hover:border-charcoal/30 dark:hover:border-cream/30 transition-colors">
            <span className="text-charcoal dark:text-cream">Standard Delivery</span>
            <span className="text-charcoal/80 dark:text-cream/80">
              Rs {SHIPPING_COST.toLocaleString()}.00
            </span>
          </label>
        </section>

        {/* Payment */}
        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-2">Payment</h2>
          <p className="text-sm text-charcoal/70 dark:text-cream/70 mb-4">
            All transactions are secure and encrypted.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-4 py-3 cursor-pointer">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="text-emerald focus:ring-emerald/50"
              />
              <span className="text-charcoal dark:text-cream">Cash on Delivery (COD)</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-4 py-3 cursor-pointer">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'bank'}
                onChange={() => setPaymentMethod('bank')}
                className="text-emerald focus:ring-emerald/50"
              />
              <span className="text-charcoal dark:text-cream">Bank Deposit</span>
            </label>
            {paymentMethod === 'bank' && (
              <div className="rounded-lg border border-sand dark:border-charcoal-light bg-sand/30 dark:bg-charcoal-light/30 p-4 text-sm text-charcoal dark:text-cream/90 space-y-2 animate-fade-in">
                <p className="font-medium text-ink dark:text-cream">Bank account details</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">Bank name:</span> Adab Commerce Bank</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">Account title:</span> Adab Clothing (Pvt) Ltd</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">Account number:</span> 01234567890</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">IBAN:</span> PK00ADAB00000000001234567890</p>
                <p className="pt-2 text-charcoal/70 dark:text-cream/70">
                  After transferring, share the transaction ID in the order notes or via email.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Right: order summary */}
      <div className="mt-10 lg:mt-0">
        <div className="lg:sticky lg:top-24 rounded-lg border border-sand dark:border-charcoal-light bg-sand/20 dark:bg-charcoal-light/20 p-6">
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Order summary</h2>
          <ul className="space-y-4 mb-6 max-h-60 overflow-y-auto">
            {items.map((item) => (
              <li key={`${item.productId}-${item.size}`} className="flex gap-3">
                <img
                  src={item.image}
                  alt=""
                  className="w-14 h-14 object-cover rounded bg-sand dark:bg-charcoal shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink dark:text-cream text-sm truncate">{item.name}</p>
                  <p className="text-xs text-charcoal/70 dark:text-cream/70">{item.size} × {item.quantity}</p>
                </div>
                <p className="text-sm text-charcoal dark:text-cream shrink-0">
                  {item.currency} {(item.price * item.quantity).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-sand dark:border-charcoal-light pt-4">
            <p className="flex justify-between text-sm text-charcoal dark:text-cream">
              <span>Subtotal</span>
              <span>{items[0]?.currency ?? 'PKR'} {subtotal.toLocaleString()}</span>
            </p>
            <p className="flex justify-between text-sm text-charcoal dark:text-cream">
              <span>Shipping</span>
              <span>Rs {SHIPPING_COST.toLocaleString()}.00</span>
            </p>
            <p className="flex justify-between font-display text-ink dark:text-cream pt-2">
              <span>Total</span>
              <span>PKR {total.toLocaleString()}</span>
            </p>
          </div>
          <button
            type="submit"
            className="w-full mt-6 py-3 bg-ink dark:bg-cream text-cream dark:text-ink font-medium rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink"
          >
            Place order (demo)
          </button>
        </div>
      </div>
    </form>
  );
}
