/**
 * Shop grid with URL-driven filters (category, price, sort) and Load more.
 * Filter changes update the URL and refetch from the backend (server-side filtering).
 */

import { useState, useCallback, useEffect } from 'react';
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

const PRICE_OPTIONS = [
  { value: 'any', label: 'Any price' },
  { value: 'under-5k', label: 'Under PKR 5,000' },
  { value: '5k-6k', label: 'PKR 5,000 – 6,500' },
  { value: 'over-6k', label: 'Over PKR 6,500' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'name-az', label: 'Name: A–Z' },
  { value: 'name-za', label: 'Name: Z–A' },
];

/** Backend expects minPriceCents/maxPriceCents (same scale as stored price, typically PKR). */
function priceRangeToCents(value: string): { minPriceCents?: number; maxPriceCents?: number } {
  switch (value) {
    case 'under-5k': return { maxPriceCents: 5000 };
    case '5k-6k': return { minPriceCents: 5000, maxPriceCents: 6500 };
    case 'over-6k': return { minPriceCents: 6500 };
    default: return {};
  }
}

function sortToBackend(value: string): { sortBy: string; sortOrder: string } {
  switch (value) {
    case 'oldest': return { sortBy: 'createdAt', sortOrder: 'asc' };
    case 'price-low': return { sortBy: 'price', sortOrder: 'asc' };
    case 'price-high': return { sortBy: 'price', sortOrder: 'desc' };
    case 'name-az': return { sortBy: 'name', sortOrder: 'asc' };
    case 'name-za': return { sortBy: 'name', sortOrder: 'desc' };
    default: return { sortBy: 'createdAt', sortOrder: 'desc' };
  }
}

export function buildShopSearchParams(params: { category?: string; price?: string; sort?: string; q?: string }): string {
  const sp = new URLSearchParams();
  if (params.category && params.category !== 'all') sp.set('category', params.category);
  if (params.price && params.price !== 'any') sp.set('price', params.price);
  if (params.sort && params.sort !== 'newest') sp.set('sort', params.sort);
  if (params.q && params.q.trim()) sp.set('q', params.q.trim());
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function parseShopSearchParams(search: string): { category: string; price: string; sort: string; q: string } {
  const sp = new URLSearchParams(search);
  return {
    category: sp.get('category')?.trim() || 'all',
    price: sp.get('price')?.trim() || 'any',
    sort: sp.get('sort')?.trim() || 'newest',
    q: sp.get('q')?.trim() || '',
  };
}

export type CategoryOption = { value: string; label: string };

interface ShopGridProps {
  initialProducts: Product[];
  total: number;
  pageSize: number;
  categories?: CategoryOption[];
  initialCategory?: string;
  initialPrice?: string;
  initialSort?: string;
  initialSearch?: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [{ value: 'all', label: 'All' }];

export default function ShopGrid({
  initialProducts,
  total: initialTotal,
  pageSize,
  categories: categoriesProp,
  initialCategory = 'all',
  initialPrice = 'any',
  initialSort = 'newest',
  initialSearch = '',
}: ShopGridProps) {
  const categories = categoriesProp?.length ? categoriesProp : DEFAULT_CATEGORIES;
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState(initialCategory);
  const [priceRange, setPriceRange] = useState(initialPrice);
  const [sort, setSort] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const hasMore = products.length < total;

  const fetchProducts = useCallback(
    async (
      page: number,
      append: boolean,
      filterOverrides?: { category: string; price: string; sort: string; q?: string }
    ) => {
      const cat = filterOverrides?.category ?? category;
      const price = filterOverrides?.price ?? priceRange;
      const sortVal = filterOverrides?.sort ?? sort;
      const searchTerm = filterOverrides?.q !== undefined ? filterOverrides.q : searchQuery;
      const params: Record<string, string | number | undefined> = {
        page,
        limit: pageSize,
        ...sortToBackend(sortVal),
      };
      if (cat && cat !== 'all') params.category = cat;
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
      Object.assign(params, priceRangeToCents(price));

      if (page === 1 && !append) setLoading(true);
      else if (append) setLoadingMore(true);
      try {
        const res = await api.getList<Product & { categories?: string[]; category?: string | null }>('/products', params);
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
    [category, priceRange, sort, searchQuery, pageSize, total]
  );

  const updateUrl = useCallback((cat: string, price: string, sortVal: string, q: string) => {
    const query = buildShopSearchParams({ category: cat, price, sort: sortVal, q: q || undefined });
    const url = `${window.location.pathname}${query}`;
    window.history.pushState({ category: cat, price, sort: sortVal, q }, '', url);
  }, []);

  const applyFilters = useCallback(
    (cat: string, price: string, sortVal: string, q?: string) => {
      const nextQ = q !== undefined ? q : searchQuery;
      setCategory(cat);
      setPriceRange(price);
      setSort(sortVal);
      if (q !== undefined) setSearchQuery(q);
      updateUrl(cat, price, sortVal, nextQ);
      fetchProducts(1, false, { category: cat, price, sort: sortVal, q: nextQ });
    },
    [updateUrl, fetchProducts, searchQuery]
  );

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseShopSearchParams(window.location.search);
      setCategory(parsed.category);
      setPriceRange(parsed.price);
      setSort(parsed.sort);
      setSearchQuery(parsed.q);
      fetchProducts(1, false, parsed);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [fetchProducts]);

  const onCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    applyFilters(value, priceRange, sort, searchQuery);
  };

  const onPriceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    applyFilters(category, value, sort, searchQuery);
  };

  const onSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    applyFilters(category, priceRange, value, searchQuery);
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchProducts(currentPage + 1, true);
  }, [currentPage, hasMore, loadingMore, fetchProducts]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-56 shrink-0">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-ash mb-2">Category</label>
            <select
              value={category}
              onChange={onCategoryChange}
              className="w-full rounded-lg border border-ash/30 bg-transparent text-soft-charcoal dark:text-off-white px-3 py-2 text-sm focus-ring"
              aria-label="Filter by category"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ash mb-2">Price</label>
            <select
              value={priceRange}
              onChange={onPriceChange}
              className="w-full rounded-lg border border-ash/30 bg-transparent text-soft-charcoal dark:text-off-white px-3 py-2 text-sm focus-ring"
              aria-label="Filter by price"
            >
              {PRICE_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ash mb-2">Sort by</label>
            <select
              value={sort}
              onChange={onSortChange}
              className="w-full rounded-lg border border-ash/30 bg-transparent text-soft-charcoal dark:text-off-white px-3 py-2 text-sm focus-ring"
              aria-label="Sort order"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </aside>
      <div className="flex-1">
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
              <p className="text-ash py-12 text-center">No products match the filters.</p>
            )}
            {hasMore && !loading && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-ash/40 px-6 py-2.5 text-sm font-medium text-soft-charcoal dark:text-off-white hover:bg-ash/10 disabled:opacity-60 transition-colors focus-ring"
                >
                  {loadingMore ? 'Loading…' : 'Continue reading'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
