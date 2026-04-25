/**
 * Editorial AIEN product card.
 *
 * - 3:4 image with subtle hover zoom.
 * - Quick-add CTA reveals on hover (variant-aware via the existing cart store).
 * - Optional wishlist toggle wired to the favorites API.
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

export default function ProductCard({ product, emphasizePrice = true }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const [wishlisted, setWishlisted] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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

  const activeVariants = (product.variants ?? []).filter((v) => v.isActive);
  const quickAddVariant =
    activeVariants.find((v) => v.stockQuantity > 0) ?? activeVariants[0];
  const defaultSize = quickAddVariant?.size ?? product.sizes?.[0] ?? ONE_SIZE_LABEL;
  const inStock = product.inStock !== false && !!quickAddVariant && quickAddVariant.stockQuantity > 0;
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
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

          {/* Wishlist button — top-right */}
          <button
            type="button"
            onClick={handleWishlist}
            disabled={favoriteLoading}
            className="absolute right-4 top-4 z-10 inline-flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-md text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-50"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            style={product.saleBadgeText ? { top: 64 } : undefined}
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* Quick add — bottom overlay */}
          {inStock && (
            <button
              type="button"
              onClick={handleQuickAdd}
              className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md text-primary py-4 font-sans text-button uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              Quick Add
            </button>
          )}
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h4 className="font-sans text-body-md text-on-surface truncate">{product.name}</h4>
            {quickAddVariant?.color && (
              <p className="font-sans text-label-caps text-on-surface-variant mt-1">
                {quickAddVariant.color.toUpperCase()}
              </p>
            )}
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
  );
}
