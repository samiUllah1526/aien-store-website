/**
 * Shop grid with category and price filters.
 * Product cards with quick actions on hover.
 */

import { useState, useMemo } from 'react';
import ProductCard from '../ProductCard';

interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  image: string;
  urduVerse?: string;
  sizes?: string[];
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'shirts', label: 'Shirts' },
  { value: 'hoodies', label: 'Hoodies' },
];

const PRICE_OPTIONS = [
  { value: 'any', label: 'Any price', min: 0, max: Infinity },
  { value: 'under-5k', label: 'Under PKR 5,000', min: 0, max: 5000 },
  { value: '5k-6k', label: 'PKR 5,000 – 6,500', min: 5000, max: 6500 },
  { value: 'over-6k', label: 'Over PKR 6,500', min: 6500, max: Infinity },
];

export default function ShopGrid({ products }: { products: Product[] }) {
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('any');

  const filtered = useMemo(() => {
    const priceOpt = PRICE_OPTIONS.find((p) => p.value === priceRange) ?? PRICE_OPTIONS[0];
    return products.filter((p) => {
      const matchCategory = category === 'all' || p.category === category;
      const matchPrice = p.price >= priceOpt.min && p.price <= priceOpt.max;
      return matchCategory && matchPrice;
    });
  }, [products, category, priceRange]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-56 shrink-0">
        <div className="space-y-6">
          <div>
            <label className="block font-display text-sm text-ink dark:text-cream mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-display text-sm text-ink dark:text-cream mb-2">Price</label>
            <select
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full rounded border border-sand dark:border-charcoal-light bg-cream dark:bg-ink text-charcoal dark:text-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald/50"
            >
              {PRICE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>
      <div className="flex-1">
        <p className="text-sm text-charcoal/70 dark:text-cream/70 mb-6">
          {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {filtered.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
        {filtered.length === 0 && (
          <p className="text-charcoal/70 dark:text-cream/70 py-12 text-center">No products match the filters.</p>
        )}
      </div>
    </div>
  );
}
