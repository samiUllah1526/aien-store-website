/**
 * Variant selector and Add to cart button.
 */

import { useMemo, useState } from 'react';
import { useCart } from '../../store/cartStore';
import { ONE_SIZE_LABEL } from './constants';
import ColorSwatch from './ColorSwatch';

type ProductVariant = {
  id: string;
  color: string;
  size: string;
  stockQuantity: number;
  priceOverrideCents?: number | null;
  isActive: boolean;
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
  const [selectedColor, setSelectedColor] = useState(colors[0] ?? 'Default');
  const sizeOptions = useMemo(() => {
    const forColor = activeVariants.filter((variant) => variant.color === selectedColor);
    return forColor.length > 0 ? forColor : activeVariants;
  }, [activeVariants, selectedColor]);
  const [size, setSize] = useState(sizeOptions[0]?.size ?? ONE_SIZE_LABEL);
  const selectedVariant = useMemo(
    () =>
      sizeOptions.find((variant) => variant.size === size) ??
      sizeOptions[0] ??
      null,
    [sizeOptions, size],
  );
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
      image,
      size: selectedVariant.size,
      quantity: 1,
    });
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mt-10 space-y-6">
      {colors.length > 1 && (
        <div>
          <label className="block text-sm text-ash mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setSelectedColor(color);
                  const next = activeVariants.find((variant) => variant.color === color);
                  if (next) setSize(next.size);
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
      )}
      <div>
        <label className="block text-sm text-ash mb-2">Size</label>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => setSize(variant.size)}
              disabled={variant.stockQuantity <= 0}
              className={`w-12 h-12 rounded-lg border text-sm font-medium transition-colors focus-ring ${
                size === variant.size
                  ? 'border-soft-charcoal dark:border-off-white bg-soft-charcoal dark:bg-off-white text-bone dark:text-charcoal'
                  : 'border-ash/40 bg-transparent text-soft-charcoal dark:text-off-white hover:border-ash'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {variant.size || ONE_SIZE_LABEL}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={!isPurchasable}
        className="w-full py-3 rounded-lg border border-soft-charcoal dark:border-off-white text-soft-charcoal dark:text-off-white font-medium hover:bg-ash/10 transition-colors duration-300 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        {added ? 'Added — view cart' : isPurchasable ? 'Wear the verse' : 'Out of stock'}
      </button>
    </div>
  );
}
