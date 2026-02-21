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
    <div className="mt-10 space-y-6">
      <div>
        <label className="block text-sm text-ash mb-2">Size</label>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`w-12 h-12 rounded-lg border text-sm font-medium transition-colors focus-ring ${
                size === s
                  ? 'border-soft-charcoal dark:border-off-white bg-soft-charcoal dark:bg-off-white text-bone dark:text-charcoal'
                  : 'border-ash/40 bg-transparent text-soft-charcoal dark:text-off-white hover:border-ash'
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
        className="w-full py-3 rounded-lg border border-soft-charcoal dark:border-off-white text-soft-charcoal dark:text-off-white font-medium hover:bg-ash/10 transition-colors duration-300 focus-ring"
      >
        {added ? 'Added — view cart' : 'Wear the verse'}
      </button>
    </div>
  );
}
