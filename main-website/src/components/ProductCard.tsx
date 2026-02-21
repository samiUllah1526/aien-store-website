/**
 * Product card with quick actions on hover: wishlist, quick view, add to cart.
 * Rounded corners, subtle animations.
 */

import { useState, useEffect } from 'react';
import { useCart } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { favoritesApi } from '../lib/api';
import { formatMoney } from '../lib/formatMoney';

export interface ProductCardProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  sizes?: string[];
  inStock?: boolean;
}

const defaultSizes = ['S', 'M', 'L', 'XL'];

export default function ProductCard({ product }: { product: ProductCardProduct }) {
  const { addItem, openCart } = useCart();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const [quickViewOpen, setQuickViewOpen] = useState(false);
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
    return () => { cancelled = true; };
  }, [isLoggedIn, product.id]);

  const sizes = product.sizes?.length ? product.sizes : defaultSizes;
  const defaultSize = sizes[0] ?? 'M';
  const inStock = product.inStock !== false;

  const handleAddToCart = (e: React.MouseEvent) => {
    if (!inStock) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      image: product.image,
      size: defaultSize,
      quantity: 1,
    });
    openCart();
    setQuickViewOpen(false);
  };

  return (
    <>
      <div className="group relative">
        <a href={`/shop/${product.slug}`} className="block">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ash/10 mb-3 relative">
            {!inStock && (
              <span className="absolute left-3 top-3 z-10 rounded-md bg-charcoal/90 dark:bg-charcoal px-2.5 py-1 text-xs font-medium text-off-white">
                Out of stock
              </span>
            )}
            <img
              src={product.image}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            />
            {/* Quick actions: appear on hover */}
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
              aria-hidden
            >
              <button
                type="button"
                disabled={favoriteLoading}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isLoggedIn) {
                    const returnTo = typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname + window.location.search) : '';
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
                }}
                className="w-10 h-10 rounded-full bg-bone/95 dark:bg-charcoal/95 shadow-sm flex items-center justify-center text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors focus-ring disabled:opacity-50"
                aria-label={wishlisted ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg
                  className="w-5 h-5"
                  fill={wishlisted ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuickViewOpen(true);
                }}
                className="w-10 h-10 rounded-full bg-bone/95 dark:bg-charcoal/95 shadow-sm flex items-center justify-center text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors focus-ring"
                aria-label="Quick view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock}
                className="w-10 h-10 rounded-full bg-bone/95 dark:bg-charcoal/95 shadow-sm flex items-center justify-center text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-soft-charcoal dark:disabled:hover:text-off-white"
                aria-label={inStock ? 'Add to cart' : 'Out of stock'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <p className="font-display text-lg text-soft-charcoal dark:text-off-white group-hover:text-mehndi transition-colors">
            {product.name}
          </p>
          <p className="text-ash text-sm mt-1">
            {formatMoney(product.price, product.currency)}
          </p>
        </a>
      </div>

      {/* Quick view modal */}
      {quickViewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50"
          onClick={() => setQuickViewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Quick view"
        >
          <div
            className="bg-bone dark:bg-charcoal rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setQuickViewOpen(false)}
                className="p-2 text-soft-charcoal dark:text-off-white hover:text-mehndi rounded-lg"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <a href={`/shop/${product.slug}`} className="block aspect-[3/4] overflow-hidden rounded-xl bg-ash/10 mb-4">
              <img src={product.image} alt="" className="w-full h-full object-cover" />
            </a>
            <h3 className="font-display text-xl text-soft-charcoal dark:text-off-white">{product.name}</h3>
            <p className="text-mehndi font-medium mt-1">{formatMoney(product.price, product.currency)}</p>
            <p className="text-sm text-ash mt-2">Size: {defaultSize} (change on product page)</p>
            <div className="mt-4 flex gap-2">
              <a
                href={`/shop/${product.slug}`}
                className="flex-1 py-2 text-center rounded-lg border border-ash/40 text-soft-charcoal dark:text-off-white hover:bg-ash/20 transition-colors"
              >
                View details
              </a>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock}
                className="flex-1 py-2 rounded-lg bg-soft-charcoal dark:bg-off-white text-bone dark:text-charcoal hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inStock ? 'Add to cart' : 'Out of stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
