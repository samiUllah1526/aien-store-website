/**
 * ShopGrid — AIEN editorial product browser.
 *
 * Two-pane layout: a left filter rail (category, size, color, price) and a
 * right grid of product cards with a sort/result-count bar above.
 *
 * Filtering is performed client-side on the build-time product array supplied
 * by Astro. This keeps the page fully static while still giving shoppers a
 * rich filter experience. To filter against the API instead, pass new data
 * down via props.
 */

import { useMemo, useState } from 'react';
import ProductCard, { type ProductCardProduct } from '../ProductCard';
import { buildImageUrl, IMAGE_PRESETS } from '../../lib/buildImageUrl';
import { colorAriaLabel, colorUiLabel } from '../../lib/colorDisplay';

export interface Product extends ProductCardProduct {
  category: string;
  urduVerse?: string;
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
  compareAtPrice?: number | null;
  saleBadgeText?: string | null;
}): Product {
  const firstCategory = p.categories?.[0] ?? p.category ?? '';
  const variants = (p.variants ?? []).map((v) => ({
    ...v,
    image: buildImageUrl(v.image, IMAGE_PRESETS.productCard),
    images: (v.images ?? [])
      .map((img) => buildImageUrl(img, IMAGE_PRESETS.productCard))
      .filter(Boolean),
  }));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: (firstCategory || '').toLowerCase(),
    price: p.price,
    currency: p.currency,
    image: buildImageUrl(p.image, IMAGE_PRESETS.productCard),
    variants,
    sizes: p.sizes,
    inStock: p.inStock,
    compareAtPrice: p.compareAtPrice ?? null,
    saleBadgeText: p.saleBadgeText ?? null,
  };
}

const SORTS = [
  { id: 'newest', label: 'NEWEST' },
  { id: 'price-asc', label: 'PRICE: LOW TO HIGH' },
  { id: 'price-desc', label: 'PRICE: HIGH TO LOW' },
  { id: 'name', label: 'NAME (A–Z)' },
] as const;
type SortId = (typeof SORTS)[number]['id'];

interface ShopGridProps {
  products: Product[];
  /** Initial page size; LOAD MORE bumps this up. */
  pageSize?: number;
}

export default function ShopGrid({ products, pageSize = 12 }: ShopGridProps) {
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      for (const v of p.variants ?? []) if (v.size) set.add(v.size);
      for (const s of p.sizes ?? []) if (s) set.add(s);
    }
    return Array.from(set).sort();
  }, [products]);

  const allColors = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) for (const v of p.variants ?? []) if (v.color) set.add(v.color);
    return Array.from(set).sort();
  }, [products]);

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const values = products.map((p) => p.price);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [products]);

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Set<string>>(new Set());
  const [maxPrice, setMaxPrice] = useState<number>(priceBounds.max);
  const [sort, setSort] = useState<SortId>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [shown, setShown] = useState(pageSize);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggle = (set: Set<string>, value: string, setter: (v: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const filtered = useMemo(() => {
    let list = products.slice();
    if (selectedCategories.size > 0) {
      list = list.filter((p) => selectedCategories.has(p.category));
    }
    if (selectedSizes.size > 0) {
      list = list.filter((p) =>
        (p.variants ?? []).some((v) => selectedSizes.has(v.size)) ||
        (p.sizes ?? []).some((s) => selectedSizes.has(s)),
      );
    }
    if (selectedColors.size > 0) {
      list = list.filter((p) => (p.variants ?? []).some((v) => selectedColors.has(v.color)));
    }
    if (maxPrice && maxPrice > 0) list = list.filter((p) => p.price <= maxPrice);

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [products, selectedCategories, selectedSizes, selectedColors, maxPrice, sort]);

  const visible = filtered.slice(0, shown);

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      {/* Mobile filters trigger */}
      <button
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        className="lg:hidden inline-flex items-center justify-between font-sans text-label-caps uppercase border border-outline-variant px-4 py-3"
        aria-expanded={filtersOpen}
        aria-controls="aien-filters"
      >
        <span>{filtersOpen ? 'Hide filters' : 'Refine selection'}</span>
        <span className="material-symbols-outlined text-base" aria-hidden>
          {filtersOpen ? 'close' : 'tune'}
        </span>
      </button>

      <aside
        id="aien-filters"
        className={`w-full lg:w-64 lg:sticky lg:top-28 self-start lg:block ${
          filtersOpen ? 'block' : 'hidden'
        }`}
        aria-label="Product filters"
      >
        <div className="space-y-12">
          {allCategories.length > 0 && (
            <div className="space-y-6">
              <h3 className="font-sans text-label-caps uppercase">Category</h3>
              <div className="flex flex-col gap-3">
                {allCategories.map((cat) => {
                  const active = selectedCategories.has(cat);
                  return (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggle(selectedCategories, cat, setSelectedCategories)}
                        className="w-4 h-4 border-outline rounded-none focus:ring-0 checked:bg-primary checked:border-primary"
                      />
                      <span
                        className={`font-body-md text-sm ${
                          active ? 'text-on-background' : 'text-on-surface-variant group-hover:text-on-background'
                        }`}
                      >
                        {cat
                          .split(/[-_\s]+/)
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                          .join(' ')}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {allSizes.length > 0 && (
            <div className="space-y-6">
              <h3 className="font-sans text-label-caps uppercase">Size</h3>
              <div className="grid grid-cols-3 gap-2">
                {allSizes.map((size) => {
                  const active = selectedSizes.has(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggle(selectedSizes, size, setSelectedSizes)}
                      className={`h-10 border font-sans text-label-caps transition-colors ${
                        active
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant text-on-background hover:border-primary'
                      }`}
                      aria-pressed={active}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {allColors.length > 0 && (
            <div className="space-y-6">
              <h3 className="font-sans text-label-caps uppercase">Color</h3>
              <div className="flex flex-wrap gap-3">
                {allColors.map((color) => {
                  const active = selectedColors.has(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => toggle(selectedColors, color, setSelectedColors)}
                      title={colorUiLabel(color)}
                      aria-pressed={active}
                      aria-label={colorAriaLabel(color)}
                      className={`w-7 h-7 rounded-full border transition-transform ${
                        active
                          ? 'ring-1 ring-offset-2 ring-primary scale-110'
                          : 'border-outline-variant hover:scale-110'
                      }`}
                      style={{ background: cssColor(color) }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {priceBounds.max > 0 && (
            <div className="space-y-6">
              <h3 className="font-sans text-label-caps uppercase">Price Range</h3>
              <div className="relative pt-2">
                <input
                  type="range"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={maxPrice || priceBounds.max}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full h-1 bg-surface-container-high appearance-none cursor-pointer accent-primary"
                  aria-label="Maximum price"
                />
                <div className="flex justify-between mt-4">
                  <span className="font-sans text-label-caps text-on-surface-variant">
                    {formatPrice(priceBounds.min)}
                  </span>
                  <span className="font-sans text-label-caps text-on-surface-variant">
                    {formatPrice(maxPrice || priceBounds.max)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedCategories(new Set());
              setSelectedSizes(new Set());
              setSelectedColors(new Set());
              setMaxPrice(priceBounds.max);
            }}
            className="link-underline"
          >
            Reset Filters
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-outline-variant">
          <span className="font-sans text-label-caps text-on-surface-variant">
            SHOWING {visible.length} OF {filtered.length} ITEMS
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortMenuOpen((o) => !o)}
              className="flex items-center gap-2 font-sans text-label-caps text-on-background hover:opacity-70 focus-ring rounded"
              aria-haspopup="listbox"
              aria-expanded={sortMenuOpen}
            >
              <span>SORT BY: {SORTS.find((s) => s.id === sort)?.label ?? 'NEWEST'}</span>
              <span className="material-symbols-outlined text-base transition-transform" aria-hidden>
                {sortMenuOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {sortMenuOpen && (
              <ul
                className="absolute right-0 top-full mt-2 min-w-[14rem] bg-background border border-outline-variant z-20"
                role="listbox"
              >
                {SORTS.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={sort === s.id}
                      onClick={() => {
                        setSort(s.id);
                        setSortMenuOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left font-sans text-label-caps hover:bg-surface-container-low transition-colors ${
                        sort === s.id ? 'text-on-background' : 'text-on-surface-variant'
                      }`}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-12 text-center text-on-surface-variant font-body-md">
            No products match your selection.
          </p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-x-3 sm:gap-x-gutter gap-y-10 sm:gap-y-16">
            {visible.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}

        {shown < filtered.length && (
          <div className="mt-24 flex justify-center">
            <button
              type="button"
              onClick={() => setShown((s) => s + pageSize)}
              className="btn-outline"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPrice(value: number): string {
  // Lightweight formatter — currency-aware formatting lives in lib/formatMoney.
  return new Intl.NumberFormat(undefined, { style: 'decimal', maximumFractionDigits: 0 }).format(
    value / 100,
  );
}

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  beige: '#d6b487',
  cream: '#f5e9d3',
  charcoal: '#1a1a1a',
  grey: '#6b7280',
  gray: '#6b7280',
  navy: '#1e293b',
  emerald: '#2b685c',
  green: '#2b685c',
  brown: '#7c4a17',
  camel: '#c19a6b',
  sand: '#e0d0a8',
};

function cssColor(label: string): string {
  const key = label.trim().toLowerCase();
  return NAMED_COLORS[key] ?? key;
}
