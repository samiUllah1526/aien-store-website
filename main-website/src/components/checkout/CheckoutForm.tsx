/**
 * Checkout: Contact, Delivery, Payment. Submits order to API (guest or with JWT).
 * Order summary is driven by server quote (POST /orders/quote) so the customer
 * always sees and pays the server-authoritative total.
 */

import { useState, useEffect } from 'react';
import { useCart, useCartStore } from '../../store/cartStore';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';

export interface QuoteLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCents: number;
  lineTotalCents: number;
}

export interface Quote {
  items: QuoteLineItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
}

export default function CheckoutForm() {
  const { items, totalAmount, cartCurrency, hasMixedCurrencies } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>('cod');
  const [saveInfo, setSaveInfo] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingCountry, setShippingCountry] = useState('PK');
  const [shippingAddressLine1, setShippingAddressLine1] = useState('');
  const [shippingAddressLine2, setShippingAddressLine2] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHasHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hasHydrated || items.length === 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    api
      .post<Quote>('/orders/quote', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      })
      .then((res) => {
        if (res.data) setQuote(res.data);
        else setQuoteError('Could not load order summary');
      })
      .catch((err) => {
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : 'Could not load order summary');
      })
      .finally(() => setQuoteLoading(false));
  }, [hasHydrated, items]);

  const currency = quote?.currency ?? cartCurrency ?? 'PKR';
  const subtotal = quote?.subtotalCents ?? totalAmount;
  const shippingCents = quote?.shippingCents ?? 0;
  const total = quote ? quote.totalCents : totalAmount + 299;

  const pricesUpdated =
    quote != null && totalAmount > 0 && quote.subtotalCents !== totalAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Email is required');
      return;
    }
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setFormError('Phone is required');
      return;
    }
    const trimmedFirstName = firstName.trim();
    if (!trimmedFirstName) {
      setFormError('First name is required');
      return;
    }
    if (items.length === 0) {
      setFormError('Cart is empty');
      return;
    }
    if (hasMixedCurrencies) {
      setFormError('All items must be in the same currency. Please use one currency per order.');
      return;
    }
    setSubmitting(true);
    try {
      const customerName = [trimmedFirstName, lastName.trim()].filter(Boolean).join(' ').trim() || undefined;
      const res = await api.post<{ id: string }>('/orders/checkout', {
        customerEmail: trimmedEmail,
        customerName,
        customerPhone: trimmedPhone,
        shippingCountry: shippingCountry.trim() || undefined,
        shippingAddressLine1: shippingAddressLine1.trim() || undefined,
        shippingAddressLine2: shippingAddressLine2.trim() || undefined,
        shippingCity: shippingCity.trim() || undefined,
        shippingPostalCode: shippingPostalCode.trim() || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setOrderId(res.data?.id ?? null);
      setSubmitted(true);
      items.forEach((item) => useCartStore.getState().removeItem(item.productId, item.size));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      setFormError(text ?? (err instanceof Error ? err.message : 'Order failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
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
          Your order has been placed.
          {orderId && (
            <span className="block mt-1 text-sm">Order ID: {orderId}</span>
          )}
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
      {formError && (
        <div className="col-span-full rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300 text-sm">
          {formError}
        </div>
      )}
      {/* Left: form sections */}
      <div className="space-y-10">
        {/* Contact */}
        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Contact</h2>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
              <a
                href="/login"
                className="text-sm text-emerald hover:text-emerald-light self-center sm:self-auto"
              >
                Sign in
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
              <input
                type="text"
                placeholder="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
            </div>
          </div>
        </section>

        {/* Delivery */}
        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Delivery</h2>
          <div className="space-y-3">
            <select
              required
              value={shippingCountry}
              onChange={(e) => setShippingCountry(e.target.value)}
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            >
              <option value="PK">Pakistan</option>
            </select>
            <input
              type="text"
              required
              placeholder="Address"
              value={shippingAddressLine1}
              onChange={(e) => setShippingAddressLine1(e.target.value)}
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            />
            <input
              type="text"
              placeholder="Apartment, suite, etc. (optional)"
              value={shippingAddressLine2}
              onChange={(e) => setShippingAddressLine2(e.target.value)}
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="City"
                value={shippingCity}
                onChange={(e) => setShippingCity(e.target.value)}
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
              <input
                type="text"
                placeholder="Postal code (optional)"
                value={shippingPostalCode}
                onChange={(e) => setShippingPostalCode(e.target.value)}
                className="rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
              />
            </div>
            <input
              type="tel"
              required
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              {formatMoney(shippingCents, currency)}
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

      {/* Right: order summary (server quote = source of truth) */}
      <div className="mt-10 lg:mt-0">
        <div className="lg:sticky lg:top-24 rounded-lg border border-sand dark:border-charcoal-light bg-sand/20 dark:bg-charcoal-light/20 p-6">
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Order summary</h2>
          {quoteLoading ? (
            <p className="text-charcoal/70 dark:text-cream/70 text-sm py-4">Loading summary…</p>
          ) : quoteError ? (
            <p className="text-amber-700 dark:text-amber-400 text-sm py-4">{quoteError}</p>
          ) : (
            <>
              <ul className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                {quote
                  ? quote.items.map((line, i) => {
                      const cartItem = items[i];
                      return (
                        <li key={`${line.productId}-${i}`} className="flex gap-3">
                          {cartItem && (
                            <img
                              src={cartItem.image}
                              alt=""
                              className="w-14 h-14 object-cover rounded bg-sand dark:bg-charcoal shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink dark:text-cream text-sm truncate">
                              {line.productName}
                            </p>
                            <p className="text-xs text-charcoal/70 dark:text-cream/70">
                              {cartItem ? `${cartItem.size} × ` : ''}{line.quantity}
                            </p>
                          </div>
                          <p className="text-sm text-charcoal dark:text-cream shrink-0">
                            {formatMoney(line.lineTotalCents, quote.currency)}
                          </p>
                        </li>
                      );
                    })
                  : items.map((item) => (
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
                          {formatMoney(item.price * item.quantity, item.currency)}
                        </p>
                      </li>
                    ))}
              </ul>
              <div className="space-y-2 border-t border-sand dark:border-charcoal-light pt-4">
                <p className="flex justify-between text-sm text-charcoal dark:text-cream">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal, currency)}</span>
                </p>
                <p className="flex justify-between text-sm text-charcoal dark:text-cream">
                  <span>Shipping</span>
                  <span>{formatMoney(shippingCents, currency)}</span>
                </p>
                <p className="flex justify-between font-display text-ink dark:text-cream pt-2">
                  <span>Total</span>
                  <span>{formatMoney(total, currency)}</span>
                </p>
              </div>
              {pricesUpdated && quote && (
                <p className="mt-4 text-amber-700 dark:text-amber-400 text-sm">
                  Prices have been updated. Your total is now {formatMoney(quote.totalCents, quote.currency)}.
                </p>
              )}
              {hasMixedCurrencies && (
                <p className="mt-4 text-amber-700 dark:text-amber-400 text-sm">
                  Cart has multiple currencies. Please use one currency per order.
                </p>
              )}
            </>
          )}
          <button
            type="submit"
            disabled={submitting || hasMixedCurrencies || !!quoteError || quoteLoading || (items.length > 0 && !quote)}
            className="w-full mt-6 py-3 bg-ink dark:bg-cream text-cream dark:text-ink font-medium rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink disabled:opacity-60"
          >
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </div>
    </form>
  );
}
