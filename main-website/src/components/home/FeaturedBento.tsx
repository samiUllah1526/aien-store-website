/**
 * FeaturedBento — editorial bento grid surfacing the top categories.
 *
 * Layout (desktop):
 *   ┌─────────────────────┬───────────────┐
 *   │ Hero category card  │ Smaller card  │
 *   │ (8 cols, full       │ (4 cols)      │
 *   │  height of grid)    ├───────────────┤
 *   │                     │ Editorial CTA │
 *   └─────────────────────┴───────────────┘
 *
 * Data is sourced from `landingCategories` (the same payload that drives
 * the existing `HomePage`); we degrade gracefully when fewer items exist.
 */

import type { LandingCategory } from './HomePage';

const DEFAULT_PRIMARY_IMAGE =
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80&auto=format&fit=crop';
const DEFAULT_SECONDARY_IMAGE =
  'https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=1000&q=80&auto=format&fit=crop';

interface FeaturedBentoProps {
  categories: LandingCategory[];
  /** Optional editorial CTA shown in the bottom-right card. */
  editorial?: {
    eyebrow?: string;
    title?: string;
    body?: string;
    href?: string;
    ctaLabel?: string;
  };
}

function categoryHref(slug: string) {
  return `/shop/category/${encodeURIComponent(slug)}`;
}

export default function FeaturedBento({
  categories,
  editorial = {
    eyebrow: 'LIMITED EDITION',
    title: 'Archive Series',
    body:
      'Rare silhouettes reimagined for the modern collector. Available for a limited window only.',
    href: '/shop',
    ctaLabel: 'Request Access',
  },
}: FeaturedBentoProps) {
  const featured = categories.filter((c) => c.productCount > 0).slice(0, 2);
  const primary = featured[0];
  const secondary = featured[1];

  if (!primary && !secondary) return null;

  return (
    <section
      className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-section-gap"
      aria-label="Featured collections"
    >
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <p className="eyebrow mb-4">FEATURED</p>
          <h2 className="font-serif text-h2-editorial text-on-background">
            Curated Collections
          </h2>
        </div>
        <a href="/shop" className="link-underline self-start md:self-end">
          View All Collections
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter md:h-[800px]">
        {primary && (
          <a
            href={categoryHref(primary.slug)}
            className="md:col-span-8 relative overflow-hidden group h-[420px] md:h-auto block focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <img
              src={primary.bannerImageUrl ?? DEFAULT_PRIMARY_IMAGE}
              alt={primary.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            <div className="absolute bottom-8 md:bottom-12 left-8 md:left-12 right-8 md:right-12">
              <p className="font-sans text-label-caps text-white/80 mb-3">SHOP THE SERIES</p>
              <h3 className="font-serif text-h3-section text-white mb-4">{primary.name}</h3>
              {primary.description && (
                <p className="font-body-md text-white/80 mb-6 max-w-md uppercase tracking-widest line-clamp-2">
                  {primary.description}
                </p>
              )}
              <span className="link-underline text-white border-white">
                Shop the Series
              </span>
            </div>
          </a>
        )}

        <div className="md:col-span-4 flex flex-col gap-gutter">
          {secondary && (
            <a
              href={categoryHref(secondary.slug)}
              className="flex-1 relative overflow-hidden group h-[260px] md:h-auto block focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <img
                src={secondary.bannerImageUrl ?? DEFAULT_SECONDARY_IMAGE}
                alt={secondary.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center flex-col p-8 text-center">
                <h3 className="font-serif text-h3-section text-white mb-2">{secondary.name}</h3>
                <span className="link-underline text-white border-white uppercase">View All</span>
              </div>
            </a>
          )}

          <div className="flex-1 bg-surface-container-high p-10 md:p-12 flex flex-col justify-center">
            {editorial.eyebrow && (
              <p className="eyebrow mb-4">{editorial.eyebrow}</p>
            )}
            {editorial.title && (
              <h3 className="font-serif text-h3-section text-on-background mb-6">
                {editorial.title}
              </h3>
            )}
            {editorial.body && (
              <p className="font-body-md text-on-surface-variant mb-8">
                {editorial.body}
              </p>
            )}
            {editorial.href && editorial.ctaLabel && (
              <a href={editorial.href} className="btn-outline self-start">
                {editorial.ctaLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
