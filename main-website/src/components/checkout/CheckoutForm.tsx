/**
 * Editorial AIEN checkout.
 *
 * Two-column layout matching the redesigned cart page:
 *   - Left: numbered editorial sections (Contact, Delivery, Shipping, Payment)
 *           with serif headings, label-caps eyebrows, and underline inputs.
 *   - Right (sticky): order summary in surface-container-low with voucher,
 *           totals, and primary "Place Order" CTA.
 *
 * Form validation and submit logic are unchanged — visual redesign only.
 */

import { useState, useEffect, useRef } from 'react';
import { randomUUID } from '../../lib/idempotency';
import { useForm } from 'react-hook-form';
import type { Resolver, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart, useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { api, profileApi, uploadPaymentProof } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';
import ColorSwatch from '../product/ColorSwatch';
import { checkoutSchema, checkoutDefaultValues, type CheckoutFormData } from './checkoutSchema';

export interface QuoteLineItem {
  productId: string;
  variantId: string;
  productName: string;
  color?: string | null;
  /** Size when provided in request. Optional. */
  size?: string | null;
  quantity: number;
  unitCents: number;
  lineTotalCents: number;
}

export interface Quote {
  items: QuoteLineItem[];
  subtotalCents: number;
  shippingCents: number;
  discountCents?: number;
  totalCents: number;
  currency: string;
  voucherCode?: string;
}

// ---------------------------------------------------------------------------
// Reusable editorial style fragments. Centralised so every input/label in this
// file shares the same underline-driven, serif-adjacent rhythm as the cart
// page redesign.
// ---------------------------------------------------------------------------
const fieldLabel =
  'block font-sans text-label-caps text-on-surface-variant mb-2';
const inputBase =
  'w-full bg-transparent border-0 border-b border-outline-variant px-0 py-3 ' +
  'font-sans text-body-md text-on-background placeholder:text-on-surface-variant ' +
  'focus:outline-none focus:border-primary transition-colors duration-200';
const inputErrorClass = 'border-error focus:border-error';
const errorText = 'mt-2 font-sans text-label-caps text-error';

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
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [banking, setBanking] = useState<{
    bankName?: string;
    accountTitle?: string;
    accountNumber?: string;
    iban?: string;
    instructions?: string;
  } | null>(null);
  const hasPrefilledShipping = useRef(false);
  /** One key per checkout attempt; reused on retry so server returns same order (no duplicate). */
  const idempotencyKeyRef = useRef<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema) as Resolver<CheckoutFormData>,
    defaultValues: checkoutDefaultValues,
  });

  const paymentMethod = watch('paymentMethod');

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
    const controller = new AbortController();
    setQuoteLoading(true);
    setQuoteError(null);
    api
      .post<Quote>('/orders/quote', {
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, color: i.color, size: i.size, quantity: i.quantity })),
        voucherCode: appliedVoucherCode || undefined,
      }, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        if (res.data) {
          setQuote(res.data);
          // If we had a voucher applied but quote returns none, it became invalid (expired/limit)
          if (appliedVoucherCode && !res.data.voucherCode) {
            setAppliedVoucherCode(null);
            setVoucherError('Voucher is no longer valid');
          }
        } else {
          setQuoteError('Could not load order summary');
        }
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : 'Could not load order summary');
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoteLoading(false);
      });
    return () => controller.abort();
  }, [hasHydrated, items, appliedVoucherCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    api
      .get<{ banking?: { bankName?: string; accountTitle?: string; accountNumber?: string; iban?: string; instructions?: string } }>('/settings/public')
      .then((res) => {
        if (res.data?.banking) setBanking(res.data.banking);
      })
      .catch(() => {});
  }, []);

  const currency = quote?.currency ?? cartCurrency ?? 'PKR';
  const subtotal = quote?.subtotalCents ?? totalAmount;
  const shippingCents = quote?.shippingCents ?? 0;
  const discountCents = quote?.discountCents ?? 0;
  const total = quote ? quote.totalCents : totalAmount + 299;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleApplyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;
    setVoucherError(null);
    setVoucherApplying(true);
    try {
      const res = await api.post<{
        success?: boolean;
        data?: { valid?: boolean };
        errorCode?: string;
        message?: string;
      }>('/vouchers/validate', {
        code,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customerEmail: useAuthStore.getState().email || undefined,
      });
      const data = (res as { data?: { valid?: boolean } }).data;
      if (res.success && data?.valid) {
        setAppliedVoucherCode(code);
        setVoucherInput('');
        setVoucherError(null);
      } else {
        setVoucherError((res as { message?: string }).message ?? 'Invalid voucher');
      }
    } catch (err) {
      setVoucherError(err instanceof Error ? err.message : 'Could not validate voucher');
    } finally {
      setVoucherApplying(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucherCode(null);
    setVoucherError(null);
  };
  const pricesUpdated =
    quote != null && totalAmount > 0 && quote.subtotalCents !== totalAmount;

  const onSubmit: SubmitHandler<CheckoutFormData> = async (data) => {
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

    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = randomUUID();
    try {
      const res = await api.post<{ id: string }>(
        '/orders/checkout',
        {
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
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, color: i.color, size: i.size, quantity: i.quantity })),
          voucherCode: appliedVoucherCode || undefined,
        },
        { headers: { 'Idempotency-Key': idempotencyKeyRef.current } },
      );
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
      items.forEach((item) => useCartStore.getState().removeItem(item.variantId));
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      const isStockError = /insufficient stock|out of stock|available:\s*0/i.test(rawMsg);
      const userMessage = isStockError
        ? 'Some items in your cart are no longer in stock. Please update your cart and try again.'
        : rawMsg || 'Order failed. Please try again.';
      setError('root', {
        message: userMessage,
        type: isStockError ? 'stock' : 'general',
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  };

  // -------------------------------------------------------------------------
  // Pre-form states (loading hydration / empty cart / submitted thank-you)
  // mirror the cart page editorial language.
  // -------------------------------------------------------------------------
  if (!hasHydrated) {
    return (
      <div className="py-24 text-center font-sans text-body-md text-on-surface-variant">
        Loading…
      </div>
    );
  }

  if (items.length === 0 && !submitted) {
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

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center">
        <span
          className="material-symbols-outlined text-secondary mb-6"
          style={{ fontSize: '48px' }}
          aria-hidden
        >
          check_circle
        </span>
        <p className="font-sans text-label-caps text-on-surface-variant mb-4">
          ORDER CONFIRMED
        </p>
        <h1 className="font-serif text-h2-editorial text-on-background uppercase mb-6">
          Thank You.
        </h1>
        <p className="font-sans text-body-md text-on-surface-variant mb-2">
          Your order has been placed and is now in our hands.
        </p>
        {orderId && (
          <p className="font-sans text-label-caps text-on-surface-variant mt-4">
            ORDER ID · <span className="text-on-background">{orderId}</span>
          </p>
        )}
        <p className="font-sans text-label-caps text-on-surface-variant mt-2">
          PAYMENT ·{' '}
          <span className="text-on-background">
            {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Bank Deposit'}
          </span>
        </p>
        <a href="/shop" className="link-underline mt-12 inline-block">
          Continue Shopping
        </a>
      </div>
    );
  }

  const submitDisabled =
    isSubmitting ||
    hasMixedCurrencies ||
    !!quoteError ||
    quoteLoading ||
    (items.length > 0 && !quote);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <header className="mb-16 md:mb-20">
        <h1 className="font-serif text-h1-display text-on-background uppercase">
          Checkout
        </h1>
        <p className="font-sans text-label-caps text-on-surface-variant mt-4">
          {itemCount} {itemCount === 1 ? 'ITEM' : 'ITEMS'} · {formatMoney(total, currency)}
        </p>
      </header>

      {errors.root && (
        <div
          ref={errorRef}
          role="alert"
          className="mb-12 border-l-2 border-error bg-error-container/40 px-6 py-5 scroll-mt-24"
        >
          <div className="flex gap-4">
            <span
              className="material-symbols-outlined text-error shrink-0"
              aria-hidden
            >
              error
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-body-md text-on-error-container">
                {errors.root.message}
              </p>
              {errors.root.type === 'stock' && (
                <a
                  href="/cart"
                  className="mt-3 inline-flex items-center gap-2 font-sans text-label-caps text-on-error-container border-b border-on-error-container pb-1 hover:opacity-70 transition-opacity"
                >
                  UPDATE YOUR CART
                  <span className="material-symbols-outlined text-base" aria-hidden>
                    arrow_forward
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">
        {/* ---------------------------------------------------------------- */}
        {/* Left column: numbered editorial sections                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-grow w-full lg:w-2/3 space-y-16">
          {/* ===== 01 — Contact ===== */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8 pb-4 border-b border-outline-variant">
              <div>
                <p className="font-sans text-label-caps text-on-surface-variant mb-2">
                  01 — Contact
                </p>
                <h2 className="font-serif text-h3-section text-on-background uppercase">
                  Who&apos;s ordering
                </h2>
              </div>
              {!isLoggedIn && (
                <a
                  href="/login?returnTo=/checkout"
                  className="link-underline text-on-background"
                >
                  Sign In
                </a>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label htmlFor="ck-firstName" className={fieldLabel}>
                    First Name
                  </label>
                  <input
                    id="ck-firstName"
                    type="text"
                    autoComplete="given-name"
                    {...register('firstName')}
                    className={`${inputBase} ${errors.firstName ? inputErrorClass : ''}`}
                  />
                  {errors.firstName && (
                    <p className={errorText}>{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="ck-lastName" className={fieldLabel}>
                    Last Name <span className="lowercase opacity-60">(optional)</span>
                  </label>
                  <input
                    id="ck-lastName"
                    type="text"
                    autoComplete="family-name"
                    {...register('lastName')}
                    className={inputBase}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="ck-email" className={fieldLabel}>
                  Email
                </label>
                <input
                  id="ck-email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className={`${inputBase} ${errors.email ? inputErrorClass : ''}`}
                />
                {errors.email && (
                  <p className={errorText}>{errors.email.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* ===== 02 — Delivery ===== */}
          <section>
            <div className="mb-8 pb-4 border-b border-outline-variant">
              <p className="font-sans text-label-caps text-on-surface-variant mb-2">
                02 — Delivery
              </p>
              <h2 className="font-serif text-h3-section text-on-background uppercase">
                Where it&apos;s going
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="ck-country" className={fieldLabel}>
                  Country / Region
                </label>
                <select
                  id="ck-country"
                  {...register('shippingCountry')}
                  className={`${inputBase} appearance-none cursor-pointer`}
                >
                  <option value="PK">Pakistan</option>
                </select>
              </div>

              <div>
                <label htmlFor="ck-address1" className={fieldLabel}>
                  Street Address
                </label>
                <input
                  id="ck-address1"
                  type="text"
                  autoComplete="address-line1"
                  {...register('shippingAddressLine1')}
                  className={`${inputBase} ${errors.shippingAddressLine1 ? inputErrorClass : ''}`}
                />
                {errors.shippingAddressLine1 && (
                  <p className={errorText}>{errors.shippingAddressLine1.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="ck-address2" className={fieldLabel}>
                  Apartment, Suite, etc. <span className="lowercase opacity-60">(optional)</span>
                </label>
                <input
                  id="ck-address2"
                  type="text"
                  autoComplete="address-line2"
                  {...register('shippingAddressLine2')}
                  className={inputBase}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label htmlFor="ck-city" className={fieldLabel}>
                    City
                  </label>
                  <input
                    id="ck-city"
                    type="text"
                    autoComplete="address-level2"
                    {...register('shippingCity')}
                    className={`${inputBase} ${errors.shippingCity ? inputErrorClass : ''}`}
                  />
                  {errors.shippingCity && (
                    <p className={errorText}>{errors.shippingCity.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="ck-postal" className={fieldLabel}>
                    Postal Code <span className="lowercase opacity-60">(optional)</span>
                  </label>
                  <input
                    id="ck-postal"
                    type="text"
                    autoComplete="postal-code"
                    {...register('shippingPostalCode')}
                    className={inputBase}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ck-phone" className={fieldLabel}>
                  Phone
                </label>
                <input
                  id="ck-phone"
                  type="tel"
                  autoComplete="tel"
                  {...register('phone')}
                  className={`${inputBase} ${errors.phone ? inputErrorClass : ''}`}
                />
                {errors.phone && (
                  <p className={errorText}>{errors.phone.message}</p>
                )}
              </div>

              {isLoggedIn && (
                <label className="flex items-start gap-3 cursor-pointer pt-2 select-none">
                  <input
                    type="checkbox"
                    {...register('saveInfo')}
                    className="mt-0.5 h-4 w-4 rounded-none border-outline text-primary focus:ring-secondary/40 cursor-pointer"
                  />
                  <span className="font-sans text-body-md text-on-background">
                    Save this information for next time
                  </span>
                </label>
              )}
            </div>
          </section>

          {/* ===== 03 — Shipping Method ===== */}
          <section>
            <div className="mb-8 pb-4 border-b border-outline-variant">
              <p className="font-sans text-label-caps text-on-surface-variant mb-2">
                03 — Shipping
              </p>
              <h2 className="font-serif text-h3-section text-on-background uppercase">
                Delivery method
              </h2>
            </div>

            {shippingCents === 0 ? (
              <div className="flex items-center justify-between gap-4 border border-outline-variant px-6 py-5">
                <div className="flex items-center gap-5 min-w-0">
                  <span
                    className="material-symbols-outlined text-secondary shrink-0"
                    aria-hidden
                  >
                    local_shipping
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-body-lg text-on-background">
                      Standard Delivery
                    </p>
                    <p className="font-sans text-label-caps text-on-surface-variant mt-1">
                      COMPLIMENTARY · 3–5 BUSINESS DAYS
                    </p>
                  </div>
                </div>
                <span className="font-sans text-label-caps text-secondary uppercase shrink-0">
                  Free
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 border border-outline-variant px-6 py-5">
                <div className="flex items-center gap-5 min-w-0">
                  <span
                    className="material-symbols-outlined text-on-surface-variant shrink-0"
                    aria-hidden
                  >
                    local_shipping
                  </span>
                  <p className="font-serif text-body-lg text-on-background">
                    Standard Delivery
                  </p>
                </div>
                <span className="font-sans text-body-md text-on-background shrink-0">
                  {formatMoney(shippingCents, currency)}
                </span>
              </div>
            )}
          </section>

          {/* ===== 04 — Payment ===== */}
          <section>
            <div className="mb-8 pb-4 border-b border-outline-variant">
              <p className="font-sans text-label-caps text-on-surface-variant mb-2">
                04 — Payment
              </p>
              <h2 className="font-serif text-h3-section text-on-background uppercase">
                How you&apos;ll pay
              </h2>
              <p className="font-sans text-label-caps text-on-surface-variant mt-3 inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base" aria-hidden>
                  lock
                </span>
                ALL TRANSACTIONS ARE SECURE AND ENCRYPTED
              </p>
            </div>

            <div className="space-y-4">
              <PaymentOption
                value="cod"
                checked={paymentMethod === 'cod'}
                register={register}
                title="Cash on Delivery"
                description="Pay in cash when your order arrives at your door."
                icon="payments"
              />
              <PaymentOption
                value="bank"
                checked={paymentMethod === 'bank'}
                register={register}
                title="Bank Deposit"
                description="Transfer to our account and upload a screenshot of the receipt."
                icon="account_balance"
              />

              {paymentMethod === 'bank' && (
                <div className="border border-outline-variant bg-surface-container-low p-6 md:p-8 space-y-5 animate-fade-in">
                  <p className="font-sans text-label-caps text-on-surface-variant">
                    BANK ACCOUNT DETAILS
                  </p>
                  <dl className="space-y-3 font-sans text-body-md text-on-background">
                    {banking?.bankName && (
                      <BankRow label="Bank" value={banking.bankName} />
                    )}
                    {banking?.accountTitle && (
                      <BankRow label="Account Title" value={banking.accountTitle} />
                    )}
                    {banking?.accountNumber && (
                      <BankRow label="Account Number" value={banking.accountNumber} />
                    )}
                    {banking?.iban && <BankRow label="IBAN" value={banking.iban} />}
                  </dl>
                  {banking?.instructions && (
                    <p className="font-sans text-body-md text-on-surface-variant pt-2 border-t border-outline-variant">
                      {banking.instructions}
                    </p>
                  )}

                  <div className="pt-2">
                    <label
                      htmlFor="ck-payment-proof"
                      className={`${fieldLabel} flex items-center gap-2`}
                    >
                      Payment Proof <span className="text-error">*</span>
                    </label>
                    <input
                      id="ck-payment-proof"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      {...register('paymentProof')}
                      className={`block w-full font-sans text-body-md text-on-background
                        file:mr-4 file:border-0 file:bg-primary file:text-on-primary
                        file:px-5 file:py-3 file:font-sans file:text-button file:uppercase file:tracking-widest
                        file:cursor-pointer hover:file:bg-secondary file:transition-colors file:duration-300
                        ${errors.paymentProof ? 'text-error' : ''}`}
                    />
                    {errors.paymentProof && (
                      <p className={errorText}>
                        {'message' in errors.paymentProof &&
                        typeof errors.paymentProof.message === 'string'
                          ? errors.paymentProof.message
                          : 'Please upload a valid image.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right column: sticky order summary                                */}
        {/* ---------------------------------------------------------------- */}
        <aside className="w-full lg:w-1/3 bg-surface-container-low p-8 md:p-12 lg:sticky lg:top-28">
          <h2 className="font-serif text-h3-section text-on-background uppercase mb-12">
            Summary
          </h2>

          {quoteLoading ? (
            <p className="font-sans text-body-md text-on-surface-variant py-6">
              Loading summary…
            </p>
          ) : quoteError ? (
            <p className="font-sans text-body-md text-error py-6">{quoteError}</p>
          ) : (
            <>
              {/* Line items */}
              <ul className="divide-y divide-outline-variant mb-10 max-h-72 overflow-y-auto -mx-2 px-2">
                {quote
                  ? quote.items.map((line) => {
                      const cartItem = items.find((c) => c.variantId === line.variantId);
                      const swatchColor = cartItem?.color ?? line.color;
                      return (
                        <li
                          key={`${line.variantId}-${line.quantity}`}
                          className="flex gap-4 py-4 first:pt-0 last:pb-0"
                        >
                          {cartItem?.image ? (
                            <img
                              src={cartItem.image}
                              alt=""
                              className="w-16 h-20 object-cover bg-surface-container shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-20 bg-surface-container shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 flex flex-col">
                            <p className="font-serif text-body-md text-on-background truncate">
                              {line.productName}
                            </p>
                            <p className="font-sans text-label-caps text-on-surface-variant mt-2 inline-flex items-center gap-2 uppercase">
                              {swatchColor && (
                                <ColorSwatch
                                  color={swatchColor}
                                  size="sm"
                                  aria-label={`Color: ${swatchColor}`}
                                />
                              )}
                              <span>
                                {(cartItem?.size ?? line.size) ? (
                                  <>{cartItem?.size ?? line.size} · </>
                                ) : null}
                                QTY {String(line.quantity).padStart(2, '0')}
                              </span>
                            </p>
                          </div>
                          <p className="font-sans text-body-md text-on-background shrink-0">
                            {formatMoney(line.lineTotalCents, quote.currency)}
                          </p>
                        </li>
                      );
                    })
                  : items.map((item) => (
                      <li
                        key={item.variantId}
                        className="flex gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="w-16 h-20 object-cover bg-surface-container shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-20 bg-surface-container shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <p className="font-serif text-body-md text-on-background truncate">
                            {item.name}
                          </p>
                          <p className="font-sans text-label-caps text-on-surface-variant mt-2 inline-flex items-center gap-2 uppercase">
                            {item.color && (
                              <ColorSwatch
                                color={item.color}
                                size="sm"
                                aria-label={`Color: ${item.color}`}
                              />
                            )}
                            <span>
                              {item.size} · QTY {String(item.quantity).padStart(2, '0')}
                            </span>
                          </p>
                        </div>
                        <p className="font-sans text-body-md text-on-background shrink-0">
                          {formatMoney(item.price * item.quantity, item.currency)}
                        </p>
                      </li>
                    ))}
              </ul>

              {/* Voucher */}
              <div className="mb-10">
                <p className={fieldLabel}>Voucher Code</p>
                {appliedVoucherCode ? (
                  <div className="flex items-center justify-between gap-3 border border-secondary/40 bg-secondary-container/40 px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-sans text-label-caps text-on-secondary-container uppercase">
                      <span
                        className="material-symbols-outlined text-base"
                        aria-hidden
                      >
                        local_offer
                      </span>
                      {appliedVoucherCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="font-sans text-label-caps text-on-secondary-container hover:opacity-70 transition-opacity uppercase"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherInput}
                      onChange={(e) => {
                        setVoucherInput(e.target.value.toUpperCase());
                        setVoucherError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyVoucher();
                        }
                      }}
                      placeholder="SUMMER20"
                      disabled={voucherApplying}
                      className={`flex-1 bg-transparent border-0 border-b px-0 py-3
                        font-sans text-body-md text-on-background placeholder:text-on-surface-variant
                        uppercase tracking-wider focus:outline-none transition-colors duration-200
                        ${
                          voucherError
                            ? 'border-error focus:border-error'
                            : 'border-outline-variant focus:border-primary'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      disabled={voucherApplying || !voucherInput.trim()}
                      className="font-sans text-label-caps uppercase tracking-widest border-b border-on-background pb-1 text-on-background hover:opacity-70 transition-opacity disabled:opacity-40"
                    >
                      {voucherApplying ? '…' : 'Apply'}
                    </button>
                  </div>
                )}
                {voucherError && <p className={errorText}>{voucherError}</p>}
              </div>

              {/* Totals */}
              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-label-caps text-on-surface-variant">
                    SUBTOTAL
                  </span>
                  <span className="font-sans text-body-md text-on-background">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>

                {discountCents > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-label-caps text-on-surface-variant">
                      DISCOUNT · {appliedVoucherCode}
                    </span>
                    <span className="font-sans text-body-md text-secondary">
                      −{formatMoney(discountCents, currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-sans text-label-caps text-on-surface-variant">
                    SHIPPING
                  </span>
                  {shippingCents === 0 ? (
                    <span className="font-sans text-label-caps text-secondary uppercase">
                      Free
                    </span>
                  ) : (
                    <span className="font-sans text-body-md text-on-background">
                      {formatMoney(shippingCents, currency)}
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-outline-variant pt-8 mb-10 flex justify-between items-baseline">
                <span className="font-sans text-label-caps text-on-background">
                  TOTAL
                </span>
                <span className="font-serif text-h2-editorial text-on-background tracking-tight leading-none">
                  {formatMoney(total, currency)}
                </span>
              </div>

              {pricesUpdated && quote && (
                <p className="font-sans text-label-caps text-secondary mb-6 uppercase tracking-wider">
                  Prices updated · New total {formatMoney(quote.totalCents, quote.currency)}
                </p>
              )}
              {hasMixedCurrencies && (
                <p className="font-sans text-body-md text-error mb-6">
                  Cart has multiple currencies. Please use one currency per order.
                </p>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
            className="block w-full bg-primary text-on-primary py-6 font-sans text-button uppercase tracking-widest text-center hover:bg-secondary transition-all duration-300 active:scale-[0.99] disabled:opacity-60 disabled:hover:bg-primary disabled:cursor-not-allowed mb-6"
          >
            {isSubmitting ? 'Placing Order…' : 'Place Order'}
          </button>

          <a
            href="/cart"
            className="block w-full text-center border border-primary text-primary py-4 font-sans text-button uppercase tracking-widest hover:bg-surface-container transition-colors mb-8"
          >
            Return to Bag
          </a>

          <div className="space-y-4">
            <div className="flex gap-4 items-start text-on-surface-variant">
              <span className="material-symbols-outlined text-lg" aria-hidden>
                lock
              </span>
              <p className="font-sans text-label-caps leading-relaxed">
                Secure checkout · Your details stay protected.
              </p>
            </div>
            <div className="flex gap-4 items-start text-on-surface-variant">
              <span className="material-symbols-outlined text-lg" aria-hidden>
                assignment_return
              </span>
              <p className="font-sans text-label-caps leading-relaxed">
                14-day extended returns for all collections.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Local presentational helpers
// ---------------------------------------------------------------------------

interface PaymentOptionProps {
  value: 'cod' | 'bank';
  checked: boolean;
  register: ReturnType<typeof useForm<CheckoutFormData>>['register'];
  title: string;
  description: string;
  icon: string;
}

/** Editorial radio card. Highlighted with a darker border when selected. */
function PaymentOption({
  value,
  checked,
  register,
  title,
  description,
  icon,
}: PaymentOptionProps) {
  return (
    <label
      className={`flex items-start gap-5 px-6 py-5 cursor-pointer transition-colors duration-200 border ${
        checked
          ? 'border-primary bg-surface-container-low'
          : 'border-outline-variant hover:border-on-surface-variant'
      }`}
    >
      <input
        type="radio"
        value={value}
        {...register('paymentMethod')}
        className="mt-1.5 h-4 w-4 border-outline text-primary focus:ring-secondary/40 cursor-pointer"
      />
      <span
        className={`material-symbols-outlined shrink-0 mt-0.5 ${
          checked ? 'text-primary' : 'text-on-surface-variant'
        }`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-serif text-body-lg text-on-background">{title}</span>
        <span className="block font-sans text-label-caps text-on-surface-variant mt-1.5 normal-case tracking-normal">
          {description}
        </span>
      </span>
    </label>
  );
}

interface BankRowProps {
  label: string;
  value: string;
}

function BankRow({ label, value }: BankRowProps) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="font-sans text-label-caps text-on-surface-variant uppercase shrink-0">
        {label}
      </dt>
      <dd className="font-sans text-body-md text-on-background text-right break-all">
        {value}
      </dd>
    </div>
  );
}
