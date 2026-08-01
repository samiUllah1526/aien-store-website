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
import { stripHtml } from '../../lib/stripHtml';
import { buildImageUrl, buildImageSrcSet, IMAGE_PRESETS } from '../../lib/buildImageUrl';

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

  // Category descriptions are now rich-text HTML (TipTap). Strip tags before
  // rendering in this card preview — HTML tags would otherwise leak through
  // (and the surrounding `uppercase` class would render them as `<H2>` etc.).
  const primaryDescription = stripHtml(primary?.description);

  const primaryImageSrc = primary
    ? buildImageUrl(primary.bannerImageUrl, IMAGE_PRESETS.bentoPrimary) || DEFAULT_PRIMARY_IMAGE
    : DEFAULT_PRIMARY_IMAGE;
  const primaryImageSrcSet = primary?.bannerImageUrl
    ? buildImageSrcSet(primary.bannerImageUrl, [640, 960, 1200], IMAGE_PRESETS.bentoPrimary)
    : '';
  const secondaryImageSrc = secondary
    ? buildImageUrl(secondary.bannerImageUrl, IMAGE_PRESETS.bentoSecondary) || DEFAULT_SECONDARY_IMAGE
    : DEFAULT_SECONDARY_IMAGE;
  const secondaryImageSrcSet = secondary?.bannerImageUrl
    ? buildImageSrcSet(secondary.bannerImageUrl, [480, 800], IMAGE_PRESETS.bentoSecondary)
    : '';

  return (
    <section
      className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-section-gap"
      aria-label="Featured collections"
    >
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <p className="eyebrow mb-4">FEATURED</p>
          <h2 className="font-serif text-h2-editorial-sm lg:text-h2-editorial text-on-background">
            Curated Collections
          </h2>
        </div>
        <a href="/shop" className="link-underline self-start md:self-end">
          View All Collections
        </a>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 md:auto-rows-fr gap-4 sm:gap-gutter md:h-[520px] lg:h-[620px] xl:h-[680px]">
        {primary && (
          <a
            href={categoryHref(primary.slug)}
            className="md:col-span-8 relative overflow-hidden group h-[300px] sm:h-[380px] md:h-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <img
              src={primaryImageSrc}
              srcSet={primaryImageSrcSet || undefined}
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 66vw"
              alt={primary.name}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-5 sm:bottom-8 md:bottom-12 left-5 sm:left-8 md:left-12 right-5 sm:right-8 md:right-12">
              <p className="font-sans text-label-caps text-white/80 mb-2 sm:mb-3">SHOP THE SERIES</p>
              <h3 className="font-serif text-h3-section text-white mb-2 sm:mb-4">{primary.name}</h3>
              {primaryDescription && (
                <p className="hidden sm:block font-body-md text-white/80 mb-4 md:mb-6 max-w-md uppercase tracking-widest line-clamp-2">
                  {primaryDescription}
                </p>
              )}
              <span className="link-underline text-white border-white">
                Shop the Series
              </span>
            </div>
          </a>
        )}

        <div className="md:col-span-4 flex flex-col gap-4 sm:gap-gutter md:h-full min-h-0">
          {secondary && (
            <a
              href={categoryHref(secondary.slug)}
              className="flex-1 min-h-0 relative overflow-hidden group h-[220px] sm:h-[240px] md:h-auto block focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              <img
                src={secondaryImageSrc}
                srcSet={secondaryImageSrcSet || undefined}
                sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 33vw"
                alt={secondary.name}
                className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center flex-col p-5 sm:p-8 text-center">
                <h3 className="font-serif text-xl sm:text-h3-section text-white mb-2">{secondary.name}</h3>
                <span className="link-underline text-white border-white uppercase">View All</span>
              </div>
            </a>
          )}

          <div className="flex-1 min-h-0 bg-surface-container-high p-6 sm:p-8 md:p-12 flex flex-col justify-center">
            {editorial.eyebrow && (
              <p className="eyebrow mb-3 sm:mb-4">{editorial.eyebrow}</p>
            )}
            {editorial.title && (
              <h3 className="font-serif text-xl sm:text-h3-section text-on-background mb-4 sm:mb-6">
                {editorial.title}
              </h3>
            )}
            {editorial.body && (
              <p className="font-body-md text-on-surface-variant mb-6 sm:mb-8 text-sm sm:text-base">
                {editorial.body}
              </p>
            )}
            {editorial.href && editorial.ctaLabel && (
              <a href={editorial.href} className="btn-outline self-start w-full sm:w-auto">
                {editorial.ctaLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
