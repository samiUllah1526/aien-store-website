/**
 * Shop page: full-bleed category banner at top, then product list (no filters).
 */

import { useState, useEffect } from 'react';
import { api, getApiBaseUrl } from '../../lib/api';
import ShopGrid from './ShopGrid';
import type { Product } from './ShopGrid';
import CategoryBanner from '../home/CategoryBanner';
import { showToast } from '../../store/toastStore';

const PAGE_SIZE = 20;
const DEFAULT_BANNER_IMAGE = 'https://picsum.photos/seed/shop/1920/600';

interface LandingCategory {
  id: string;
  name: string;
  slug: string;
  bannerImageUrl: string | null;
}

function mapProduct(p: Record<string, unknown>): Product {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const img = p.image as string;
  const firstCat = (p.categories as string[])?.[0] ?? (p.category as string) ?? '';
  const variants = ((p.variants as Array<Record<string, unknown>> | undefined) ?? []).map((variant) => {
    const variantImage = String(variant.image ?? '');
    const variantImagesRaw = (variant.images as string[] | undefined) ?? [];
    return {
      ...variant,
      image: variantImage
        ? (variantImage.startsWith('http') ? variantImage : `${baseUrl}${variantImage.startsWith('/') ? '' : '/'}${variantImage}`)
        : '',
      images: variantImagesRaw.map((image) => (
        image.startsWith('http') ? image : `${baseUrl}${image.startsWith('/') ? '' : '/'}${image}`
      )),
    };
  });
  return {
    id: String(p.id),
    slug: String(p.slug),
    name: String(p.name),
    category: String(firstCat).toLowerCase(),
    price: Number(p.price),
    currency: String(p.currency ?? 'PKR'),
    image: img ? (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`) : '',
    variants: variants as Product['variants'],
    sizes: (p.sizes as string[] | undefined) ?? undefined,
    inStock: p.inStock !== false,
  };
}

/** Products: all, newest first. No filters. */
function buildQuery(): Record<string, string | number> {
  return {
    page: 1,
    limit: PAGE_SIZE,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [bannerImage, setBannerImage] = useState<string>(DEFAULT_BANNER_IMAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [productsRes, landingRes] = await Promise.all([
          api.getList<Record<string, unknown>>('/products', buildQuery()),
          api.get<LandingCategory[]>('/categories/landing'),
        ]);
        if (cancelled) return;

        const prodData = productsRes as { success?: boolean; data?: unknown[]; meta?: { total?: number } };
        if (prodData?.success && Array.isArray(prodData.data)) {
          setProducts(prodData.data.map((p) => mapProduct(p as Record<string, unknown>)));
          setTotal(prodData.meta?.total ?? prodData.data.length);
        } else {
          showToast('Failed to load products');
        }

        const landingData = landingRes as { success?: boolean; data?: LandingCategory[] };
        if (landingData?.success && Array.isArray(landingData.data) && landingData.data.length > 0) {
          const slug = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('category')?.trim().toLowerCase()
            : null;
          const cat = slug
            ? landingData.data.find((c) => (c.slug || '').toLowerCase() === slug)
            : landingData.data[0];
          setBannerImage(cat?.bannerImageUrl ?? DEFAULT_BANNER_IMAGE);
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
      <>
        <CategoryBanner imageSrc={DEFAULT_BANNER_IMAGE} imageAlt="Shop" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <header className="mb-16">
            <h1 className="font-display text-2xl md:text-3xl text-soft-charcoal dark:text-off-white">Shop</h1>
            <p className="mt-4 text-ash max-w-prose">Return to silence. Hoodies and oversized shirts with poetry on fabric.</p>
          </header>
          <p className="text-ash py-12 text-center">Loading…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <CategoryBanner imageSrc={bannerImage} imageAlt="Shop" />
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
        />
      </div>
    </>
  );
}
