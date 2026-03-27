/**
 * Shop grid: product list with Load more. No filters.
 */

import { useState, useCallback } from 'react';
import ProductCard from '../ProductCard';
import { api, getApiBaseUrl } from '../../lib/api';
import { showToast } from '../../store/toastStore';

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

function mapApiProductToProduct(p: { id: string; slug: string; name: string; categories?: string[]; category?: string | null; price: number; currency: string; image: string; variants?: Array<{ id: string; color: string; size: string; stockQuantity: number; priceOverrideCents?: number | null; isActive: boolean; image?: string; images?: string[] }>; sizes?: string[]; inStock?: boolean }): Product {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const firstCategory = p.categories?.[0] ?? p.category ?? '';
  const variants = (p.variants ?? []).map((variant) => ({
    ...variant,
    image: variant.image
      ? (variant.image.startsWith('http') ? variant.image : `${baseUrl}${variant.image.startsWith('/') ? '' : '/'}${variant.image}`)
      : '',
    images: (variant.images ?? []).map((image) =>
      image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`
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
  initialProducts: Product[];
  total: number;
  pageSize: number;
}

export default function ShopGrid({
  initialProducts,
  total: initialTotal,
  pageSize,
}: ShopGridProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasMore = products.length < total;

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      if (page === 1 && !append) setLoading(true);
      else if (append) setLoadingMore(true);
      try {
        const res = await api.getList<Product & { categories?: string[]; category?: string | null }>('/products', {
          page,
          limit: pageSize,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        const list = res.data ?? [];
        const mapped = list.map((p) => mapApiProductToProduct(p));
        const newTotal = res.meta?.total ?? total;
        if (append) {
          setProducts((prev) => [...prev, ...mapped]);
          setCurrentPage(page);
        } else {
          setProducts(mapped);
          setCurrentPage(1);
        }
        setTotal(newTotal);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize, total]
  );

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchPage(currentPage + 1, true);
  }, [currentPage, hasMore, loadingMore, fetchPage]);

  return (
    <div>
      <p className="text-sm text-ash mb-6">
        {loading ? '…' : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
        {total > products.length && ` of ${total}`}
      </p>
      {loading ? (
        <p className="text-ash py-12 text-center">Loading…</p>
      ) : (
        <>
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
          {hasMore && !loading && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-ash/40 px-6 py-2.5 text-sm font-medium text-soft-charcoal dark:text-off-white hover:bg-ash/10 disabled:opacity-60 transition-colors focus-ring"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
