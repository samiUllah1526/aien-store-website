/**
 * Shop page: fetches categories and products client-side. Static shell.
 */

import { useState, useEffect } from 'react';
import { api, getApiBaseUrl } from '../../lib/api';
import ShopGrid, { type CategoryOption } from './ShopGrid';
import type { Product } from './ShopGrid';
import { showToast } from '../../store/toastStore';

const PAGE_SIZE = 20;

function mapProduct(p: Record<string, unknown>): Product {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const img = p.image as string;
  const firstCat = (p.categories as string[])?.[0] ?? (p.category as string) ?? '';
  return {
    id: String(p.id),
    slug: String(p.slug),
    name: String(p.name),
    category: String(firstCat).toLowerCase(),
    price: Number(p.price),
    currency: String(p.currency ?? 'PKR'),
    image: img ? (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`) : '',
    sizes: (p.sizes as string[] | undefined) ?? undefined,
  };
}

function parseParams(): { category: string; price: string; sort: string } {
  if (typeof window === 'undefined') return { category: 'all', price: 'any', sort: 'newest' };
  const sp = new URLSearchParams(window.location.search);
  return {
    category: sp.get('category')?.trim() || 'all',
    price: sp.get('price')?.trim() || 'any',
    sort: sp.get('sort')?.trim() || 'newest',
  };
}

function buildQuery(category: string, price: string, sort: string): Record<string, string | number> {
  const params: Record<string, string | number> = { page: 1, limit: PAGE_SIZE };
  if (category && category !== 'all') params.category = category;
  if (price === 'under-5k') params.maxPriceCents = 5000;
  else if (price === '5k-6k') { params.minPriceCents = 5000; params.maxPriceCents = 6500; }
  else if (price === 'over-6k') params.minPriceCents = 6500;
  if (sort === 'oldest') { params.sortBy = 'createdAt'; params.sortOrder = 'asc'; }
  else if (sort === 'price-low') { params.sortBy = 'price'; params.sortOrder = 'asc'; }
  else if (sort === 'price-high') { params.sortBy = 'price'; params.sortOrder = 'desc'; }
  else if (sort === 'name-az') { params.sortBy = 'name'; params.sortOrder = 'asc'; }
  else if (sort === 'name-za') { params.sortBy = 'name'; params.sortOrder = 'desc'; }
  else { params.sortBy = 'createdAt'; params.sortOrder = 'desc'; }
  return params;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryOption[]>([{ value: 'all', label: 'All' }]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { category, price, sort } = parseParams();

    async function load() {
      setLoading(true);
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.getList<Record<string, unknown>>('/products', buildQuery(category, price, sort)),
          api.get<Array<{ slug: string; name: string }>>('/categories'),
        ]);
        if (cancelled) return;

        const prodData = productsRes as { success?: boolean; data?: unknown[]; meta?: { total?: number } };
        if (prodData?.success && Array.isArray(prodData.data)) {
          setProducts(prodData.data.map((p) => mapProduct(p as Record<string, unknown>)));
          setTotal(prodData.meta?.total ?? prodData.data.length);
        } else {
          showToast('Failed to load products');
        }

        const catData = categoriesRes as { success?: boolean; data?: Array<{ slug: string; name: string }> };
        if (catData?.success && Array.isArray(catData.data)) {
          setCategories([
            { value: 'all', label: 'All' },
            ...catData.data.map((c) => ({ value: (c.slug || '').toLowerCase(), label: c.name || c.slug })),
          ]);
        }
      } catch (err) {
        if (!cancelled) showToast(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading && products.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <header className="mb-16">
          <h1 className="font-display text-2xl md:text-3xl text-soft-charcoal dark:text-off-white">Shop</h1>
          <p className="mt-4 text-ash max-w-prose">Return to silence. Hoodies and oversized shirts with poetry on fabric.</p>
        </header>
        <p className="text-ash py-12 text-center">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-24">
      <header className="mb-16">
        <h1 className="font-display text-2xl md:text-3xl text-soft-charcoal dark:text-off-white">Shop</h1>
        <p className="mt-4 text-ash max-w-prose">
          Return to silence. Hoodies and oversized shirts with poetry on fabric.
        </p>
      </header>
      <ShopGrid
        initialProducts={products}
        total={total}
        pageSize={PAGE_SIZE}
        categories={categories}
        initialCategory={parseParams().category}
        initialPrice={parseParams().price}
        initialSort={parseParams().sort}
      />
    </div>
  );
}
