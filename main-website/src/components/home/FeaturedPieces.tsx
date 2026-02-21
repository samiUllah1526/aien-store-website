/**
 * Featured pieces: 2–3 products, large imagery.
 * Hover reveals: Urdu verse inspiration + short reflective English description.
 * No aggressive hover effects.
 */

import { useState } from 'react';
import { formatMoney } from '../../lib/formatMoney';

export interface FeaturedProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  urduVerse?: string | null;
  urduVerseTransliteration?: string | null;
  description?: string | null;
}

export default function FeaturedPieces({ products }: { products: FeaturedProduct[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (products.length === 0) return null;

  const displayed = products.slice(0, 3);

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6" aria-label="Featured pieces">
      <ul className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
        {displayed.map((product) => (
          <li key={product.id}>
            <a
              href={`/shop/${product.slug}`}
              className="block group"
              onMouseEnter={() => setHoveredId(product.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ash/10 relative">
                <img
                  src={product.image}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-600 ease-out group-hover:scale-[1.02]"
                />
                <div
                  className={`absolute inset-0 bg-charcoal/80 flex flex-col justify-center items-center p-6 text-center transition-opacity duration-500 ${
                    hoveredId === product.id ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden
                >
                  {product.urduVerse && (
                    <p className="urdu-text text-urdu-large text-off-white leading-loose mb-4">
                      {product.urduVerse}
                    </p>
                  )}
                  {product.description && (
                    <p className="text-off-white/80 text-sm max-w-xs leading-relaxed">
                      {product.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <p className="font-display text-lg text-soft-charcoal dark:text-off-white">
                  {product.name}
                </p>
                <p className="text-ash text-sm mt-1">
                  {formatMoney(product.price, product.currency)}
                </p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
