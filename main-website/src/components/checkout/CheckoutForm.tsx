/**
 * Checkout: Contact, Delivery, Payment. Submits order to API (guest or with JWT).
 * Form validation with React Hook Form + Zod. Bank Deposit requires payment proof upload.
 */

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart, useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { api, profileApi, uploadPaymentProof } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';
import { checkoutSchema, checkoutDefaultValues, type CheckoutFormData } from './checkoutSchema';

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
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const storedEmail = useAuthStore((s) => s.email);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const hasPrefilledShipping = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: checkoutDefaultValues,
  });

  const paymentMethod = watch('paymentMethod');
  const saveInfo = watch('saveInfo');

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHasHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHasHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (storedEmail) setValue('email', storedEmail);
  }, [storedEmail, setValue]);

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn || hasPrefilledShipping.current) return;
    hasPrefilledShipping.current = true;
    profileApi
      .getShipping()
      .then((saved) => {
        if (!saved) return;
        if (saved.firstName) setValue('firstName', saved.firstName);
        if (saved.lastName) setValue('lastName', saved.lastName);
        if (saved.customerPhone) setValue('phone', saved.customerPhone);
        if (saved.shippingCountry) setValue('shippingCountry', saved.shippingCountry);
        if (saved.shippingAddressLine1) setValue('shippingAddressLine1', saved.shippingAddressLine1);
        if (saved.shippingAddressLine2) setValue('shippingAddressLine2', saved.shippingAddressLine2 ?? '');
        if (saved.shippingCity) setValue('shippingCity', saved.shippingCity);
        if (saved.shippingPostalCode) setValue('shippingPostalCode', saved.shippingPostalCode ?? '');
      })
      .catch(() => {
        hasPrefilledShipping.current = false;
      });
  }, [hasHydrated, isLoggedIn, setValue]);

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

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      setError('root', { message: 'Cart is empty' });
      return;
    }
    if (hasMixedCurrencies) {
      setError('root', {
        message: 'All items must be in the same currency. Please use one currency per order.',
      });
      return;
    }
    clearErrors('root');

    let paymentProofMediaId: string | undefined;
    if (data.paymentMethod === 'bank' && data.paymentProof?.length && data.paymentProof[0]) {
      try {
        paymentProofMediaId = await uploadPaymentProof(data.paymentProof[0]);
      } catch (err) {
        setError('paymentProof', {
          message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
        });
        return;
      }
    }

    try {
      const res = await api.post<{ id: string }>('/orders/checkout', {
        customerEmail: data.email.trim(),
        customerFirstName: data.firstName.trim(),
        customerLastName: data.lastName?.trim() || undefined,
        customerPhone: data.phone.trim(),
        shippingCountry: data.shippingCountry?.trim() || undefined,
        shippingAddressLine1: data.shippingAddressLine1?.trim() || undefined,
        shippingAddressLine2: data.shippingAddressLine2?.trim() || undefined,
        shippingCity: data.shippingCity?.trim() || undefined,
        shippingPostalCode: data.shippingPostalCode?.trim() || undefined,
        paymentMethod: data.paymentMethod === 'bank' ? 'BANK_DEPOSIT' : 'COD',
        paymentProofMediaId: paymentProofMediaId || undefined,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      setOrderId(res.data?.id ?? null);
      setSubmitted(true);
      if (data.saveInfo && useAuthStore.getState().isLoggedIn()) {
        profileApi
          .saveShipping({
            firstName: data.firstName.trim(),
            lastName: data.lastName?.trim() || undefined,
            customerPhone: data.phone.trim(),
            shippingCountry: data.shippingCountry?.trim() || undefined,
            shippingAddressLine1: data.shippingAddressLine1?.trim() || undefined,
            shippingAddressLine2: data.shippingAddressLine2?.trim() || undefined,
            shippingCity: data.shippingCity?.trim() || undefined,
            shippingPostalCode: data.shippingPostalCode?.trim() || undefined,
          })
          .catch(() => {});
      }
      items.forEach((item) => useCartStore.getState().removeItem(item.productId, item.size));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      const text = Array.isArray(msg) ? msg[0] : msg;
      setError('root', {
        message: text ?? (err instanceof Error ? err.message : 'Order failed. Please try again.'),
      });
    }
  };

  const inputClass =
    'rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50';
  const inputErrorClass = 'border-red-500 dark:border-red-400';

  if (!hasHydrated) {
    return (
      <div className="py-12 text-center text-charcoal/70 dark:text-cream/70">Loading…</div>
    );
  }

  if (items.length === 0 && !submitted) {
    return (
      <div className="py-12 text-center text-charcoal/70 dark:text-cream/70">
        <p>Your cart is empty.</p>
        <a href="/shop" className="mt-4 inline-block text-emerald hover:text-emerald-light font-medium">
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
          {orderId && <span className="block mt-1 text-sm">Order ID: {orderId}</span>}
        </p>
        <p className="mt-3 text-sm text-charcoal/70 dark:text-cream/70">
          Payment method: {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Deposit'}
        </p>
        <a href="/shop" className="mt-6 inline-block text-emerald hover:text-emerald-light font-medium">
          Back to shop
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-12 xl:gap-16">
      {errors.root && (
        <div className="col-span-full rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-300 text-sm">
          {errors.root.message}
        </div>
      )}
      <div className="space-y-10">
        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Contact</h2>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  placeholder="Email"
                  {...register('email')}
                  className={`w-full ${inputClass} ${errors.email ? inputErrorClass : ''}`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>
              <a href="/login" className="text-sm text-emerald hover:text-emerald-light self-center sm:self-auto">
                Sign in
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="First name"
                  {...register('firstName')}
                  className={`w-full ${inputClass} ${errors.firstName ? inputErrorClass : ''}`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Last name (optional)"
                  {...register('lastName')}
                  className={`w-full ${inputClass}`}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Delivery</h2>
          <div className="space-y-3">
            <div>
              <select {...register('shippingCountry')} className={`w-full ${inputClass}`}>
                <option value="PK">Pakistan</option>
              </select>
            </div>
            <div>
              <input
                type="text"
                placeholder="Address"
                {...register('shippingAddressLine1')}
                className={`w-full ${inputClass} ${errors.shippingAddressLine1 ? inputErrorClass : ''}`}
              />
              {errors.shippingAddressLine1 && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shippingAddressLine1.message}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                placeholder="Apartment, suite, etc. (optional)"
                {...register('shippingAddressLine2')}
                className={`w-full ${inputClass}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="City"
                  {...register('shippingCity')}
                  className={`w-full ${inputClass} ${errors.shippingCity ? inputErrorClass : ''}`}
                />
                {errors.shippingCity && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shippingCity.message}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Postal code (optional)"
                  {...register('shippingPostalCode')}
                  className={`w-full ${inputClass}`}
                />
              </div>
            </div>
            <div>
              <input
                type="tel"
                placeholder="Phone"
                {...register('phone')}
                className={`w-full ${inputClass} ${errors.phone ? inputErrorClass : ''}`}
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone.message}</p>
              )}
            </div>
            {isLoggedIn && (
              <label className="flex items-center gap-2 text-sm text-charcoal dark:text-cream/90 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('saveInfo')}
                  className="rounded border-sand dark:border-charcoal-light text-emerald focus:ring-emerald/50"
                />
                Save this information for next time
              </label>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-4">Shipping method</h2>
          {shippingCents === 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-emerald/30 bg-emerald/5 dark:bg-emerald/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald/20 dark:bg-emerald/30 text-emerald dark:text-emerald-300" aria-hidden>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="font-medium text-ink dark:text-cream">Standard Delivery</p>
                  <p className="text-sm text-charcoal/70 dark:text-cream/70">Delivery to your address</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald px-3 py-1.5 text-sm font-semibold text-white shadow-sm dark:bg-emerald-600">
                Free
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-4 py-3">
              <span className="text-charcoal dark:text-cream">Standard Delivery</span>
              <span className="text-charcoal/80 dark:text-cream/80">{formatMoney(shippingCents, currency)}</span>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg text-ink dark:text-cream mb-2">Payment</h2>
          <p className="text-sm text-charcoal/70 dark:text-cream/70 mb-4">
            All transactions are secure and encrypted.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-lg border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-4 py-3 cursor-pointer">
              <input type="radio" value="cod" {...register('paymentMethod')} className="text-emerald focus:ring-emerald/50" />
              <span className="text-charcoal dark:text-cream">Cash on Delivery (COD)</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-sand dark:border-charcoal-light bg-cream dark:bg-ink px-4 py-3 cursor-pointer">
              <input type="radio" value="bank" {...register('paymentMethod')} className="text-emerald focus:ring-emerald/50" />
              <span className="text-charcoal dark:text-cream">Bank Deposit</span>
            </label>
            {paymentMethod === 'bank' && (
              <div className="rounded-lg border border-sand dark:border-charcoal-light bg-sand/30 dark:bg-charcoal-light/30 p-4 text-sm text-charcoal dark:text-cream/90 space-y-3 animate-fade-in">
                <p className="font-medium text-ink dark:text-cream">Bank account details</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">Bank name:</span> Adab Commerce Bank</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">Account title:</span> Adab Clothing (Pvt) Ltd</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">Account number:</span> 01234567890</p>
                <p><span className="text-charcoal/70 dark:text-cream/70">IBAN:</span> PK00ADAB00000000001234567890</p>
                <p className="pt-2 text-charcoal/70 dark:text-cream/70">
                  After transferring, upload a screenshot of your payment as proof.
                </p>
                <div>
                  <label className="block text-sm font-medium text-ink dark:text-cream mb-1">
                    Payment proof (screenshot) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    {...register('paymentProof')}
                    className={`block w-full text-sm text-charcoal dark:text-cream file:mr-3 file:rounded file:border-0 file:bg-emerald file:px-3 file:py-2 file:text-sm file:text-cream file:hover:opacity-90 ${errors.paymentProof ? 'border-red-500' : ''}`}
                  />
                  {errors.paymentProof && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.paymentProof.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

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
                            <p className="font-medium text-ink dark:text-cream text-sm truncate">{line.productName}</p>
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
                        <img src={item.image} alt="" className="w-14 h-14 object-cover rounded bg-sand dark:bg-charcoal shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink dark:text-cream text-sm truncate">{item.name}</p>
                          <p className="text-xs text-charcoal/70 dark:text-cream/70">
                            {item.size} × {item.quantity}
                          </p>
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
                  {shippingCents === 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/15 px-2 py-0.5 text-emerald dark:bg-emerald/25 dark:text-emerald-300 font-medium">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Free
                    </span>
                  ) : (
                    <span>{formatMoney(shippingCents, currency)}</span>
                  )}
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
            disabled={isSubmitting || hasMixedCurrencies || !!quoteError || quoteLoading || (items.length > 0 && !quote)}
            className="w-full mt-6 py-3 bg-ink dark:bg-cream text-cream dark:text-ink font-medium rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink disabled:opacity-60"
          >
            {isSubmitting ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </div>
    </form>
  );
}
