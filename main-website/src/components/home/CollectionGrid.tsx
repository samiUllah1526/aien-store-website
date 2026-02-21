/**
 * Collection grid: loose spacing, few items per row.
 * Embrace negative space. Link to full shop.
 */

import { formatMoney } from '../../lib/formatMoney';

export interface CollectionProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
}

export default function CollectionGrid({
  products,
}: {
  products: CollectionProduct[];
}) {
  const displayed = products.slice(0, 6);

  return (
    <section className="py-24 md:py-32 px-4 sm:px-6" aria-label="Collection">
      <div className="max-w-5xl mx-auto">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-20">
          {displayed.map((product) => (
            <li key={product.id}>
              <a href={`/shop/${product.slug}`} className="block group">
                <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ash/10 mb-6">
                  <img
                    src={product.image}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-600 ease-out group-hover:scale-[1.02]"
                  />
                </div>
                <p className="font-display text-lg text-soft-charcoal dark:text-off-white">
                  {product.name}
                </p>
                <p className="text-ash text-sm mt-1">
                  {formatMoney(product.price, product.currency)}
                </p>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-20 text-center">
          <a
            href="/shop"
            className="inline-block font-display text-sm text-ash hover:text-soft-charcoal dark:hover:text-off-white transition-colors duration-300"
          >
            Continue reading →
          </a>
        </div>
      </div>
    </section>
  );
}
