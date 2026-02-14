/**
 * Product card with quick actions on hover: wishlist, quick view, add to cart.
 * Subtle fade-in animation for the action icons (inspired by premium fashion grids).
 */

import { useState } from 'react';
import { useCart } from '../store/cartStore';
import { formatMoney } from '../lib/formatMoney';

export interface ProductCardProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  sizes?: string[];
}

const defaultSizes = ['S', 'M', 'L', 'XL'];

export default function ProductCard({ product }: { product: ProductCardProduct }) {
  const { addItem, openCart } = useCart();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const sizes = product.sizes?.length ? product.sizes : defaultSizes;
  const defaultSize = sizes[0] ?? 'M';

  const handleAddToCart = (e: React.MouseEvent) => {
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
          <div className="aspect-[3/4] overflow-hidden rounded-lg bg-sand dark:bg-charcoal-light shadow-soft mb-3 relative">
            <img
              src={product.image}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            />
            {/* Quick actions: appear on hover with subtle slide + fade */}
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
              aria-hidden
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWishlisted((w) => !w);
                }}
                className="w-10 h-10 rounded-full bg-cream/95 dark:bg-ink/95 shadow-soft flex items-center justify-center text-charcoal dark:text-cream hover:text-emerald transition-colors focus:outline-none focus:ring-2 focus:ring-emerald/50"
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
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
                className="w-10 h-10 rounded-full bg-cream/95 dark:bg-ink/95 shadow-soft flex items-center justify-center text-charcoal dark:text-cream hover:text-emerald transition-colors focus:outline-none focus:ring-2 focus:ring-emerald/50"
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
                className="w-10 h-10 rounded-full bg-cream/95 dark:bg-ink/95 shadow-soft flex items-center justify-center text-charcoal dark:text-cream hover:text-emerald transition-colors focus:outline-none focus:ring-2 focus:ring-emerald/50"
                aria-label="Add to cart"
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
          <p className="font-display text-lg text-ink dark:text-cream group-hover:text-emerald transition-colors">
            {product.name}
          </p>
          <p className="text-charcoal/70 dark:text-cream/70 text-sm mt-1">
            {formatMoney(product.price, product.currency)}
          </p>
        </a>
      </div>

      {/* Quick view modal */}
      {quickViewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-ink/70"
          onClick={() => setQuickViewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Quick view"
        >
          <div
            className="bg-cream dark:bg-ink rounded-lg shadow-soft-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setQuickViewOpen(false)}
                className="p-2 text-charcoal dark:text-cream hover:text-emerald rounded"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <a href={`/shop/${product.slug}`} className="block aspect-[3/4] overflow-hidden rounded-lg bg-sand dark:bg-charcoal-light mb-4">
              <img src={product.image} alt="" className="w-full h-full object-cover" />
            </a>
            <h3 className="font-display text-xl text-ink dark:text-cream">{product.name}</h3>
            <p className="text-emerald font-medium mt-1">{formatMoney(product.price, product.currency)}</p>
            <p className="text-sm text-charcoal/70 dark:text-cream/70 mt-2">Size: {defaultSize} (change on product page)</p>
            <div className="mt-4 flex gap-2">
              <a
                href={`/shop/${product.slug}`}
                className="flex-1 py-2 text-center border border-sand dark:border-charcoal-light rounded text-charcoal dark:text-cream hover:bg-sand dark:hover:bg-charcoal-light transition-colors"
              >
                View details
              </a>
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-2 bg-ink dark:bg-cream text-cream dark:text-ink rounded hover:opacity-90 transition-opacity"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
