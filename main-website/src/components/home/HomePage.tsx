/**
 * Homepage composition — AIEN editorial flow.
 *
 *   1. Editorial hero (image carousel from admin settings)
 *   2. Featured products (admin "featured" flag) in "Featured Selection"
 *   3. Featured bento grid (top categories)
 *   4. One curated selection per remaining landing category
 *   5. Featured customer reviews carousel
 *   6. Customer Spotlight (admin-uploaded images/reels)
 *   7. Newsletter "Join the Circle"
 */

import type { HeroSlide } from '../../config';
import { heroHeadline as configHeroHeadline } from '../../config';
import { stripHtml } from '../../lib/stripHtml';
import type { PublicSocialProof } from '../../lib/settings';
import HeroImageCarousel from './HeroImageCarousel';
import FeaturedBento from './FeaturedBento';
import CuratedSelection from './CuratedSelection';
import FeaturedReviewsCarousel, { type FeaturedReview } from './FeaturedReviewsCarousel';
import CustomerSpotlightCarousel, { type SpotlightItem } from './CustomerSpotlightCarousel';
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
  /** Build-time fetched admin-featured reviews for homepage. */
  featuredReviews?: FeaturedReview[];
  /** Build-time fetched Customer Spotlight items. */
  spotlightItems?: SpotlightItem[];
  /** Editable section titles for reviews + spotlight. */
  socialProof?: PublicSocialProof;
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
  saleType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | null;
  saleDiscountValue?: number | null;
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
  featuredReviews = [],
  spotlightItems = [],
  socialProof = {
    reviewsEyebrow: 'CUSTOMER LOVE',
    reviewsTitle: 'What they say',
    spotlightEyebrow: 'IN THE WILD',
    spotlightTitle: 'Customer Spotlight',
  },
}: HomePageProps) {
  const populatedCategories = landingCategories.filter((c) => c.productCount > 0);
  const remainingCategories = populatedCategories.slice(2);

  // Prefer a featured product's Urdu verse when available; otherwise fall
  // back to the dedicated hero headline (NOT the meta description, which is
  // a full sentence and renders poorly as an h1).
  const heroHeadline =
    shopAll.find((p) => p.urduVerse?.trim())?.urduVerse?.trim() ?? configHeroHeadline;

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

      {(featuredReviews.length > 0 || spotlightItems.length > 0) && (
        <div className="pb-20 md:pb-24">
          <FeaturedReviewsCarousel
            reviews={featuredReviews}
            eyebrow={socialProof.reviewsEyebrow}
            title={socialProof.reviewsTitle}
          />

          <CustomerSpotlightCarousel
            items={spotlightItems}
            eyebrow={socialProof.spotlightEyebrow}
            title={socialProof.spotlightTitle}
          />
        </div>
      )}

      <NewsletterSection />
    </div>
  );
}
