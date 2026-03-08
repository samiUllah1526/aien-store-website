/**
 * Variant selector and Add to cart button.
 */

import { useMemo, useState, useEffect } from 'react';
import { useCart } from '../../store/cartStore';
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
}: Props) {
  const { addItem, openCart } = useCart();
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
        (v) => v.color === selectedColor && (v.size || ONE_SIZE_LABEL) === size
      ) ?? null,
    [activeVariants, selectedColor, size],
  );
  const variantForSize = (s: string) =>
    activeVariants.find(
      (v) => v.color === selectedColor && (v.size || ONE_SIZE_LABEL) === s
    ) ?? null;
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

  return (
    <div className="mt-10 space-y-6">
        <div>
          <label className="block text-sm text-ash mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setSelectedColor(color);
                  const firstForColor = activeVariants.find((v) => v.color === color);
                  if (firstForColor) setSize(firstForColor.size || ONE_SIZE_LABEL);
                }}
                className={`inline-flex items-center justify-center p-2 rounded-full border text-sm font-medium transition-colors focus-ring ${
                  selectedColor === color
                    ? 'border-soft-charcoal dark:border-off-white ring-2 ring-soft-charcoal dark:ring-off-white ring-offset-2 ring-offset-bone dark:ring-offset-charcoal'
                    : 'border-ash/40 bg-transparent hover:border-ash'
                }`}
                aria-pressed={selectedColor === color}
                aria-label={`Color: ${color}`}
                title={color}
              >
                <ColorSwatch color={color} size="md" />
              </button>
            ))}
          </div>
        </div>
      <div>
        <label className="block text-sm text-ash mb-2">Size</label>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((sizeOption) => {
            const variant = variantForSize(sizeOption);
            const outOfStock = !variant || variant.stockQuantity <= 0;
            const sizeTooltip = outOfStock
              ? !variant
                ? `${sizeOption}: Not available in this color`
                : `${sizeOption}: Out of stock`
              : undefined;
            return (
              <Tooltip key={sizeOption} content={outOfStock ? sizeTooltip : undefined}>
                <button
                  type="button"
                  onClick={() => setSize(sizeOption)}
                  disabled={outOfStock}
                  aria-label={sizeTooltip ?? sizeOption}
                  className={`w-12 h-12 rounded-lg border text-sm font-medium transition-colors focus-ring ${
                  size === sizeOption
                    ? 'border-soft-charcoal dark:border-off-white bg-soft-charcoal dark:bg-off-white text-bone dark:text-charcoal'
                    : 'border-ash/40 bg-transparent text-soft-charcoal dark:text-off-white hover:border-ash'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {sizeOption}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!isPurchasable}
        className="w-full py-3 rounded-lg border border-soft-charcoal dark:border-off-white text-soft-charcoal dark:text-off-white font-medium hover:bg-ash/10 transition-colors duration-300 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        {added ? 'Added — view cart' : isPurchasable ? 'Add to cart' : 'Out of stock'}
      </button>
    </div>
  );
}
