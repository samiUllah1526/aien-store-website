/**
 * Shop grid: static product list (data supplied at build time from Astro).
 */

import ProductCard from '../ProductCard';
import { getApiBaseUrl } from '../../lib/api';

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  image: string;
  urduVerse?: string;
  variants?: Array<{
    id: string;
    color: string;
    size: string;
    stockQuantity: number;
    priceOverrideCents?: number | null;
    isActive: boolean;
    image?: string;
    images?: string[];
  }>;
  sizes?: string[];
  inStock?: boolean;
}

export function mapApiProductToProduct(p: {
  id: string;
  slug: string;
  name: string;
  categories?: string[];
  category?: string | null;
  price: number;
  currency: string;
  image: string;
  variants?: Array<{
    id: string;
    color: string;
    size: string;
    stockQuantity: number;
    priceOverrideCents?: number | null;
    isActive: boolean;
    image?: string;
    images?: string[];
  }>;
  sizes?: string[];
  inStock?: boolean;
}): Product {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const firstCategory = p.categories?.[0] ?? p.category ?? '';
  const variants = (p.variants ?? []).map((variant) => ({
    ...variant,
    image: variant.image
      ? (variant.image.startsWith('http') ? variant.image : `${baseUrl}${variant.image.startsWith('/') ? '' : '/'}${variant.image}`)
      : '',
    images: (variant.images ?? []).map((image) =>
      image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`,
    ),
  }));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: (firstCategory || '').toLowerCase(),
    price: p.price,
    currency: p.currency,
    image: p.image ? (p.image.startsWith('http') ? p.image : `${baseUrl}${p.image.startsWith('/') ? '' : '/'}${p.image}`) : '',
    variants,
    sizes: p.sizes,
    inStock: p.inStock,
  };
}

interface ShopGridProps {
  products: Product[];
}

export default function ShopGrid({ products }: ShopGridProps) {
  return (
    <div>
      <p className="text-sm text-ash mb-6">
        {`${products.length} ${products.length === 1 ? 'product' : 'products'}`}
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-12 md:gap-16">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
      {products.length === 0 && (
        <p className="text-ash py-12 text-center">No products yet.</p>
      )}
    </div>
  );
}
