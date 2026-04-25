/**
 * CuratedSelection — editorial product grid section.
 *
 * Renders a section header (eyebrow + serif title + "view all" link) followed
 * by a 3-up grid of product cards. Backend-fed via the `Product` shape used by
 * the existing HomePage.
 */

import ProductCard from '../ProductCard';
import type { Product } from './HomePage';

interface CuratedSelectionProps {
  products: Product[];
  eyebrow?: string;
  title?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  /** Cap how many products to show; remaining are linked via "View all". */
  limit?: number;
}

export default function CuratedSelection({
  products,
  eyebrow = 'SHOP CURATED',
  title = 'Featured Selection',
  viewAllHref = '/shop',
  viewAllLabel = 'View All Products',
  limit = 6,
}: CuratedSelectionProps) {
  if (products.length === 0) return null;
  const items = products.slice(0, limit);

  return (
    <section
      className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-section-gap"
      aria-label={title}
    >
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-16">
        <div>
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h2 className="font-serif text-h2-editorial-sm lg:text-h2-editorial text-on-background">
            {title}
          </h2>
        </div>
        <a href={viewAllHref} className="link-underline self-start md:self-end">
          {viewAllLabel}
        </a>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-gutter gap-y-16">
        {items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
