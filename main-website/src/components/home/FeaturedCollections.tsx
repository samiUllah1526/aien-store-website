/**
 * Featured product grid with hover quick actions (wishlist, quick view, add to cart).
 */

import ProductCard from '../ProductCard';

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  urduVerse?: string;
  featured?: boolean;
  sizes?: string[];
}

export default function FeaturedCollections({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
