/**
 * Size selector and Add to cart button.
 * Uses cart context to add item and optionally open sidebar.
 */

import { useState } from 'react';
import { useCart } from '../../store/cartStore';

interface Props {
  productId: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  image: string;
  sizes: string[];
}

export default function AddToCart({
  productId,
  name,
  slug,
  price,
  currency,
  image,
  sizes,
}: Props) {
  const { addItem, openCart } = useCart();
  const [size, setSize] = useState(sizes[0] ?? 'M');
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem({
      productId,
      name,
      slug,
      price,
      currency,
      image,
      size,
      quantity: 1,
    });
    openCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mt-8 space-y-4">
      <div>
        <label className="block font-display text-sm text-ink dark:text-cream mb-2">Size</label>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`w-12 h-12 rounded border text-sm font-medium transition-colors ${
                size === s
                  ? 'border-ink dark:border-cream bg-ink dark:bg-cream text-cream dark:text-ink'
                  : 'border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream hover:border-charcoal dark:hover:border-cream/70'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-3 bg-ink dark:bg-cream text-cream dark:text-ink font-medium rounded hover:opacity-90 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink"
      >
        {added ? 'Added — view cart' : 'Add to cart'}
      </button>
    </div>
  );
}
