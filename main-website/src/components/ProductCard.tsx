/**
 * Editorial AIEN product card.
 *
 * - Sharp 3:4 image with subtle hover zoom (editorial, magazine feel).
 * - Three circular quick-actions slide in from the right on hover:
 *     wishlist · quick view · add to bag.
 * - Quick view opens a focused modal with the larger image, meta and a
 *   one-click add-to-bag, so shoppers can triage without losing the grid.
 * - Title + price metadata sits below the image with editorial typography.
 *
 * The exported component name and `Product` shape are preserved so existing
 * usages (HomePage, ShopGrid, etc.) keep working.
 */

import { useEffect, useState } from 'react';
import { useCart } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { favoritesApi } from '../lib/api';
import { formatMoney } from '../lib/formatMoney';
import { formatColorLabel, isHexColorString } from '../lib/colorDisplay';
import { ONE_SIZE_LABEL } from './product/constants';

export interface ProductCardVariant {
  id: string;
  color: string;
  size: string;
  stockQuantity: number;
  priceOverrideCents?: number | null;
  isActive: boolean;
  image?: string;
  images?: string[];
}

export interface ProductCardProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  variants?: ProductCardVariant[];
  sizes?: string[];
  inStock?: boolean;
  compareAtPrice?: number | null;
  saleBadgeText?: string | null;
}

interface ProductCardProps {
  product: ProductCardProduct;
  /** Show the price in the editorial teal accent. Default true. */
  emphasizePrice?: boolean;
}

const HEART_PATH =
  'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z';
const SEARCH_PATH = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z';
const BAG_PATH = 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z';

export default function ProductCard({ product, emphasizePrice = true }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const [wishlisted, setWishlisted] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !product.id) return;
    let cancelled = false;
    favoritesApi
      .getIds()
      .then((ids) => {
        if (!cancelled && Array.isArray(ids)) setWishlisted(ids.includes(product.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, product.id]);

  // Lock body scroll + ESC-to-close while the quick view is open.
  useEffect(() => {
    if (!quickViewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuickViewOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [quickViewOpen]);

  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  const quickAddVariant =
    activeVariants.find((v) => v.stockQuantity > 0) ?? activeVariants[0];
  const defaultSize = quickAddVariant?.size ?? product.sizes?.[0] ?? ONE_SIZE_LABEL;
  const inStock = product.inStock !== false && !!quickAddVariant && quickAddVariant.stockQuantity > 0;
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;

  const handleQuickAdd = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!inStock || !quickAddVariant) return;
    addItem({
      productId: product.id,
      variantId: quickAddVariant.id,
      color: quickAddVariant.color,
      name: product.name,
      slug: product.slug,
      price: quickAddVariant.priceOverrideCents ?? product.price,
      currency: product.currency,
      image: quickAddVariant.image || quickAddVariant.images?.[0] || product.image,
      size: defaultSize,
      quantity: 1,
    });
    openCart();
    setQuickViewOpen(false);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      const returnTo =
        typeof window !== 'undefined'
          ? encodeURIComponent(window.location.pathname + window.location.search)
          : '';
      window.location.href = `/login?returnTo=${returnTo}`;
      return;
    }
    setFavoriteLoading(true);
    try {
      if (wishlisted) {
        await favoritesApi.remove(product.id);
        setWishlisted(false);
      } else {
        await favoritesApi.add(product.id);
        setWishlisted(true);
      }
    } catch {
      // keep current state on error
    } finally {
      setFavoriteLoading(false);
    }
  };

  const openQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  return (
    <>
      <article className="group">
        <a
          href={`/shop/${product.slug}`}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <div className="relative aspect-[3/4] bg-surface-container-low overflow-hidden mb-6">
            {product.saleBadgeText && (
              <span className="absolute left-4 top-4 z-10 bg-primary text-on-primary px-3 py-1 font-sans text-label-caps">
                {product.saleBadgeText}
              </span>
            )}
            {!inStock && (
              <span className="absolute right-4 top-4 z-10 bg-on-background/80 text-on-primary px-3 py-1 font-sans text-label-caps">
                Sold Out
              </span>
            )}

            {product.image ? (
              <img
                src={product.image}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined" aria-hidden>image</span>
              </div>
            )}

            {/* Quick-action stack — slides in from the right on hover. */}
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out"
              aria-hidden={false}
            >
              <QuickActionButton
                onClick={handleWishlist}
                disabled={favoriteLoading}
                ariaLabel={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                active={wishlisted}
              >
                <svg
                  className="w-5 h-5"
                  fill={wishlisted ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={HEART_PATH}
                  />
                </svg>
              </QuickActionButton>

              <QuickActionButton onClick={openQuickView} ariaLabel="Quick view">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={SEARCH_PATH}
                  />
                </svg>
              </QuickActionButton>

              <QuickActionButton
                onClick={handleQuickAdd}
                disabled={!inStock}
                ariaLabel={inStock ? 'Add to bag' : 'Out of stock'}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={BAG_PATH}
                  />
                </svg>
              </QuickActionButton>
            </div>
          </div>

          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <h4 className="font-sans text-body-md text-on-surface truncate">{product.name}</h4>
              {quickAddVariant?.color &&
                (() => {
                  const c = quickAddVariant.color;
                  const label = formatColorLabel(c);
                  if (!label && isHexColorString(c)) return null;
                  const line = label || c;
                  if (!line.trim()) return null;
                  return (
                    <p className="font-sans text-label-caps text-on-surface-variant mt-1">
                      {line.toUpperCase()}
                    </p>
                  );
                })()}
            </div>
            <div className="text-right shrink-0">
              <span
                className={`font-sans text-body-md ${
                  emphasizePrice ? 'text-secondary' : 'text-on-surface'
                }`}
              >
                {formatMoney(product.price, product.currency)}
              </span>
              {onSale && (
                <span className="block font-sans text-label-caps text-on-surface-variant line-through mt-1">
                  {formatMoney(product.compareAtPrice ?? 0, product.currency)}
                </span>
              )}
            </div>
          </div>
        </a>
      </article>

      {quickViewOpen && (
        <QuickViewModal
          product={product}
          variantColor={quickAddVariant?.color}
          variantImage={quickAddVariant?.image || quickAddVariant?.images?.[0]}
          defaultSize={defaultSize}
          inStock={inStock}
          onSale={onSale}
          onClose={() => setQuickViewOpen(false)}
          onAddToBag={() => handleQuickAdd()}
        />
      )}
    </>
  );
}

interface QuickActionButtonProps {
  onClick: (e: React.MouseEvent) => void;
  ariaLabel: string;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function QuickActionButton({
  onClick,
  ariaLabel,
  disabled = false,
  active = false,
  children,
}: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active || undefined}
      className={`w-10 h-10 rounded-full bg-background/95 backdrop-blur-md shadow-sm flex items-center justify-center transition-colors duration-200 hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'text-secondary' : 'text-on-background hover:text-secondary'
      }`}
    >
      {children}
    </button>
  );
}

interface QuickViewModalProps {
  product: ProductCardProduct;
  variantColor?: string;
  variantImage?: string;
  defaultSize: string;
  inStock: boolean;
  onSale: boolean;
  onClose: () => void;
  onAddToBag: () => void;
}

function QuickViewModal({
  product,
  variantColor,
  variantImage,
  defaultSize,
  inStock,
  onSale,
  onClose,
  onAddToBag,
}: QuickViewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view — ${product.name}`}
    >
      <div
        className="relative bg-background w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex items-center justify-center w-10 h-10 text-on-surface hover:text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          aria-label="Close quick view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="aspect-[3/4] bg-surface-container-low overflow-hidden">
            {(variantImage || product.image) && (
              <img
                src={variantImage || product.image}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="p-8 md:p-10 flex flex-col">
            {product.saleBadgeText && (
              <span className="self-start bg-primary text-on-primary px-3 py-1 font-sans text-label-caps mb-6">
                {product.saleBadgeText}
              </span>
            )}

            <h2 className="font-serif text-h3-section text-on-background mb-3">
              {product.name}
            </h2>

            {variantColor &&
              (() => {
                const label = formatColorLabel(variantColor);
                if (!label && isHexColorString(variantColor)) return null;
                const line = label || variantColor;
                if (!line.trim()) return null;
                return (
                  <p className="font-sans text-label-caps text-on-surface-variant mb-6">
                    {line.toUpperCase()}
                  </p>
                );
              })()}

            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-sans text-body-lg text-secondary">
                {formatMoney(product.price, product.currency)}
              </span>
              {onSale && (
                <span className="font-sans text-label-caps text-on-surface-variant line-through">
                  {formatMoney(product.compareAtPrice ?? 0, product.currency)}
                </span>
              )}
            </div>

            <p className="font-sans text-label-caps text-on-surface-variant mb-10">
              Size {defaultSize} · Choose options on the product page
            </p>

            <div className="mt-auto flex flex-col sm:flex-row gap-3">
              <a
                href={`/shop/${product.slug}`}
                className="flex-1 inline-flex items-center justify-center border border-primary text-primary font-sans text-button uppercase tracking-widest px-6 py-4 hover:bg-primary hover:text-on-primary transition-colors duration-300"
              >
                View Details
              </a>
              <button
                type="button"
                onClick={onAddToBag}
                disabled={!inStock}
                className="flex-1 inline-flex items-center justify-center bg-primary text-on-primary font-sans text-button uppercase tracking-widest px-6 py-4 hover:bg-secondary transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
              >
                {inStock ? 'Add to Bag' : 'Sold Out'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
