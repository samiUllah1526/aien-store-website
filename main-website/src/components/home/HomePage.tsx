/**
 * Homepage composition — AIEN editorial flow.
 *
 *   1. Editorial hero (image carousel from admin settings)
 *   2. Featured products (admin "featured" flag) in "Featured Selection"
 *   3. Featured bento grid (top categories)
 *   4. One curated selection per remaining landing category
 *   5. Newsletter "Join the Circle"
 *
 * Data props are unchanged from the previous shape so the Astro entry in
 * `src/pages/index.astro` continues to work without modification.
 */

import type { HeroSlide } from '../../config';
import { defaultMetaDescription } from '../../config';
import { stripHtml } from '../../lib/stripHtml';
import HeroImageCarousel from './HeroImageCarousel';
import FeaturedBento from './FeaturedBento';
import CuratedSelection from './CuratedSelection';
import NewsletterSection from './NewsletterSection';

interface HomePageProps {
  videoSrc?: string;
  videoPoster?: string;
  /** Hero image carousel slides. */
  heroSlides?: HeroSlide[];
  /** Build-time fetched product list for the lead curated selection. */
  shopAll?: Product[];
  /** Build-time fetched landing categories. */
  landingCategories?: LandingCategory[];
  /** Build-time fetched products grouped by category slug. */
  productsBySlug?: Record<string, Product[]>;
}

export interface ProductVariantSummary {
  id: string;
  color: string;
  size: string;
  stockQuantity: number;
  priceOverrideCents?: number | null;
  isActive: boolean;
  image?: string;
  images?: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  variantImage?: string;
  /** Full variant payload (id/color/size/stock) so cards can quick-add. */
  variants?: ProductVariantSummary[];
  inStock?: boolean;
  urduVerse?: string | null;
  urduVerseTransliteration?: string | null;
  description?: string | null;
  sizes?: string[];
  compareAtPrice?: number | null;
  saleBadgeText?: string | null;
  featured?: boolean;
}

export interface LandingCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerImageUrl: string | null;
  landingOrder: number | null;
  productCount: number;
}

export default function HomePage({
  heroSlides = [],
  shopAll = [],
  landingCategories = [],
  productsBySlug = {},
}: HomePageProps) {
  const populatedCategories = landingCategories.filter((c) => c.productCount > 0);
  const remainingCategories = populatedCategories.slice(2);

  const taglineLine = (() => {
    const s = defaultMetaDescription.trim();
    const dot = s.indexOf('.');
    return dot >= 0 ? s.slice(0, dot + 1).trim() : s;
  })();
  const heroHeadline =
    shopAll.find((p) => p.urduVerse?.trim())?.urduVerse?.trim() ?? taglineLine;

  const featuredProducts = shopAll.filter((p) => p.featured);

  return (
    <div className="flex flex-col">
      <HeroImageCarousel slides={heroSlides} headline={heroHeadline} />

      {featuredProducts.length > 0 && (
        <CuratedSelection
          products={featuredProducts}
          eyebrow="SHOP CURATED"
          title="Featured Selection"
          viewAllHref="/shop"
        />
      )}

      <FeaturedBento categories={populatedCategories} />

      {remainingCategories.map((cat) => (
        <CuratedSelection
          key={cat.id}
          products={productsBySlug[cat.slug] ?? []}
          eyebrow={(() => {
            const plain = stripHtml(cat.description);
            return plain ? plain.toUpperCase().slice(0, 60) : undefined;
          })()}
          title={cat.name}
          viewAllHref={`/shop/category/${encodeURIComponent(cat.slug)}`}
          viewAllLabel="View Collection"
        />
      ))}

      <NewsletterSection />
    </div>
  );
}
