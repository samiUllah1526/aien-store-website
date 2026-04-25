/**
 * AIEN editorial variant selector + Add to Bag CTA.
 *
 * - Color row with swatches (1.5rem circles + outer ring on selection).
 * - Square size cells (4-up grid) — disabled state for OOS / unavailable.
 * - Full-width primary "Add to Bag" + outline "Add to Wishlist" stack.
 * - Compact Composition / Shipping accordion below the CTA.
 *
 * The component contract (props) is unchanged; only the styling and a few
 * small UX additions (wishlist + accordion) are new. The cart store
 * integration and variant selection logic are untouched.
 */

import { useMemo, useState, useEffect } from 'react';
import { useCart } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { favoritesApi } from '../../lib/api';
import { ONE_SIZE_LABEL } from './constants';
import ColorSwatch from './ColorSwatch';
import Tooltip from '../Tooltip';

export type ProductVariant = {
  id: string;
  color: string;
  size: string;
  stockQuantity: number;
  priceOverrideCents?: number | null;
  isActive: boolean;
  image?: string;
  images?: string[];
};

interface Props {
  productId: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  image: string;
  variants: ProductVariant[];
  inStock?: boolean;
  /** Called when the selected variant changes (e.g. to drive carousel images). */
  onVariantChange?: (variant: ProductVariant | null) => void;
  /** Optional editorial copy for the composition accordion. */
  composition?: string;
  shippingNote?: string;
}

export default function AddToCart({
  productId,
  name,
  slug,
  price,
  currency,
  image,
  variants,
  inStock = true,
  onVariantChange,
  composition,
  shippingNote,
}: Props) {
  const { addItem, openCart } = useCart();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());

  const activeVariants = useMemo(
    () => (variants ?? []).filter((variant) => variant.isActive),
    [variants],
  );
  const colors = useMemo(
    () => [...new Set(activeVariants.map((variant) => variant.color))],
    [activeVariants],
  );
  const allSizes = useMemo(
    () => [...new Set(activeVariants.map((v) => v.size || ONE_SIZE_LABEL))],
    [activeVariants],
  );

  const [selectedColor, setSelectedColor] = useState(colors[0] ?? 'Default');
  const [size, setSize] = useState(allSizes[0] ?? ONE_SIZE_LABEL);

  const selectedVariant = useMemo(
    () =>
      activeVariants.find(
        (v) => v.color === selectedColor && (v.size || ONE_SIZE_LABEL) === size,
      ) ?? null,
    [activeVariants, selectedColor, size],
  );
  const variantForSize = (s: string) =>
    activeVariants.find((v) => v.color === selectedColor && (v.size || ONE_SIZE_LABEL) === s) ??
    null;

  useEffect(() => {
    onVariantChange?.(selectedVariant ?? null);
  }, [selectedVariant, onVariantChange]);

  useEffect(() => {
    if (selectedVariant) return;
    const firstForColor = activeVariants.find((v) => v.color === selectedColor);
    if (firstForColor) setSize(firstForColor.size || ONE_SIZE_LABEL);
  }, [selectedColor, selectedVariant, activeVariants]);

  const isPurchasable = inStock && !!selectedVariant && selectedVariant.stockQuantity > 0;
  const displayPrice = selectedVariant?.priceOverrideCents ?? price;
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!isPurchasable || !selectedVariant) return;
    addItem({
      productId,
      variantId: selectedVariant.id,
      color: selectedVariant.color,
      name,
      slug,
      price: displayPrice,
      currency,
      image: selectedVariant.image || selectedVariant.images?.[0] || image,
      size: selectedVariant.size,
      quantity: 1,
    });
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Wishlist toggle (mirrors ProductCard behaviour).
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  useEffect(() => {
    if (!isLoggedIn || !productId) return;
    let cancelled = false;
    favoritesApi
      .getIds()
      .then((ids) => {
        if (!cancelled && Array.isArray(ids)) setWishlisted(ids.includes(productId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, productId]);
  const handleWishlist = async () => {
    if (!isLoggedIn) {
      const returnTo =
        typeof window !== 'undefined'
          ? encodeURIComponent(window.location.pathname + window.location.search)
          : '';
      window.location.href = `/login?returnTo=${returnTo}`;
      return;
    }
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await favoritesApi.remove(productId);
        setWishlisted(false);
      } else {
        await favoritesApi.add(productId);
        setWishlisted(true);
      }
    } catch {
      // ignore
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {colors.length > 0 && (
        <div>
          <span className="font-sans text-label-caps uppercase block mb-4">
            Color: <span className="text-on-surface-variant">{selectedColor}</span>
          </span>
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const active = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelectedColor(color);
                    const firstForColor = activeVariants.find((v) => v.color === color);
                    if (firstForColor) setSize(firstForColor.size || ONE_SIZE_LABEL);
                  }}
                  className={`inline-flex items-center justify-center p-1 transition-all focus-ring rounded-full ${
                    active
                      ? 'ring-2 ring-offset-2 ring-primary'
                      : 'ring-0 hover:ring-1 hover:ring-offset-2 hover:ring-outline-variant'
                  }`}
                  aria-pressed={active}
                  aria-label={`Color: ${color}`}
                  title={color}
                >
                  <ColorSwatch color={color} size="md" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {allSizes.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="font-sans text-label-caps uppercase">Select Size</span>
            <button
              type="button"
              className="font-sans text-label-caps uppercase underline underline-offset-4 text-on-surface-variant hover:text-on-background"
            >
              Size Guide
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {allSizes.map((sizeOption) => {
              const variant = variantForSize(sizeOption);
              const outOfStock = !variant || variant.stockQuantity <= 0;
              const sizeTooltip = outOfStock
                ? !variant
                  ? `${sizeOption}: Not available in this color`
                  : `${sizeOption}: Out of stock`
                : undefined;
              const active = size === sizeOption;
              return (
                <Tooltip key={sizeOption} content={outOfStock ? sizeTooltip : undefined}>
                  <button
                    type="button"
                    onClick={() => setSize(sizeOption)}
                    disabled={outOfStock}
                    aria-label={sizeTooltip ?? sizeOption}
                    className={`w-full py-4 border font-sans text-label-caps transition-colors focus-ring ${
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : outOfStock
                          ? 'border-outline-variant text-on-surface-variant/50 line-through'
                          : 'border-outline-variant text-on-background hover:border-primary'
                    } disabled:cursor-not-allowed`}
                  >
                    {sizeOption}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!isPurchasable}
          className="w-full bg-primary text-on-primary font-sans text-button uppercase tracking-widest py-6 hover:bg-secondary transition-colors duration-300 active:scale-[0.99] focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
        >
          {added ? 'Added — view bag' : isPurchasable ? 'Add to Bag' : 'Out of Stock'}
        </button>
        <button
          type="button"
          onClick={handleWishlist}
          disabled={wishlistLoading}
          className="w-full border border-primary text-primary font-sans text-button uppercase tracking-widest py-6 hover:bg-surface-container-low transition-colors focus-ring disabled:opacity-50"
        >
          {wishlisted ? 'Saved to Wishlist' : 'Add to Wishlist'}
        </button>
      </div>

      <div className="border-t border-outline-variant pt-6 space-y-2">
        <details className="group">
          <summary className="flex justify-between items-center cursor-pointer list-none py-2">
            <span className="font-sans text-label-caps uppercase">Composition &amp; Care</span>
            <span
              className="material-symbols-outlined group-open:rotate-180 transition-transform"
              aria-hidden
            >
              expand_more
            </span>
          </summary>
          <div className="pt-4 text-sm text-on-surface-variant space-y-2 leading-relaxed">
            {composition ? (
              <p>{composition}</p>
            ) : (
              <>
                <p>Premium materials, ethically sourced.</p>
                <p>Refer to product label for care instructions.</p>
              </>
            )}
          </div>
        </details>
        <details className="group">
          <summary className="flex justify-between items-center cursor-pointer list-none py-2">
            <span className="font-sans text-label-caps uppercase">Shipping &amp; Returns</span>
            <span
              className="material-symbols-outlined group-open:rotate-180 transition-transform"
              aria-hidden
            >
              expand_more
            </span>
          </summary>
          <div className="pt-4 text-sm text-on-surface-variant leading-relaxed">
            <p>
              {shippingNote ??
                'Complimentary climate-neutral delivery on qualifying orders. Standard returns within 14 days of delivery.'}
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
