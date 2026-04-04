/**
 * Paginated fetch of store products for Astro static builds (Node at build time).
 */
import { mapApiProductToProduct, type Product } from '../components/shop/ShopGrid';

type ApiRow = Parameters<typeof mapApiProductToProduct>[0];

export async function fetchAllProductsAtBuild(
  storeApiBaseUrl: string,
  options?: { categorySlug?: string },
): Promise<Product[]> {
  const limit = 100;
  const out: Product[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const q = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    if (options?.categorySlug) q.set('category', options.categorySlug);
    const res = await fetch(`${storeApiBaseUrl}/products?${q.toString()}`);
    const json = await res.json();
    if (!res.ok || !json.success || !Array.isArray(json.data)) break;
    const rows = json.data as ApiRow[];
    for (const row of rows) out.push(mapApiProductToProduct(row));
    const total = json.meta?.total ?? 0;
    hasMore = out.length < total && rows.length === limit;
    page += 1;
  }
  return out;
}
