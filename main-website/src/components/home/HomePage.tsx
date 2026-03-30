/**
 * Home page: landing layout per e-commerce reference.
 * Hero carousel, motto, SHOP ALL, category banners (from backend), feature strip.
 */

import type { HeroSlide } from '../../config';
import CinematicVideoHero from './CinematicVideoHero';
import HeroImageCarousel from './HeroImageCarousel';
import LandingMotto from './LandingMotto';
import ProductCarousel from './ProductCarousel';
import CategoryBanner from './CategoryBanner';
import FeatureStrip from './FeatureStrip';
import SiteContainer from '../layout/SiteContainer';

interface HomePageProps {
  videoSrc?: string;
  videoPoster?: string;
  /** Hero image carousel slides. When length > 0, carousel is shown instead of video hero. */
  heroSlides?: HeroSlide[];
  /** Build-time fetched product list for SHOP ALL carousel. */
  shopAll?: Product[];
  /** Build-time fetched landing categories. */
  landingCategories?: LandingCategory[];
  /** Build-time fetched products grouped by category slug. */
  productsBySlug?: Record<string, Product[]>;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  /** Optional; home `mapProduct` merges variant into `image`, so this is often omitted. */
  variantImage?: string;
  variants?: { image?: string }[];
  urduVerse?: string | null;
  urduVerseTransliteration?: string | null;
  description?: string | null;
  sizes?: string[];
  compareAtPrice?: number | null;
}

/** Landing category from GET /categories/landing */
export interface LandingCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerImageUrl: string | null;
  landingOrder: number | null;
  productCount: number;
}

const DEFAULT_BANNER_IMAGE = 'https://picsum.photos/seed/category/600/750';

export default function HomePage({
  videoSrc = '/videos/hero.mp4',
  videoPoster,
  heroSlides = [],
  shopAll = [],
  landingCategories = [],
  productsBySlug = {},
}: HomePageProps) {
  const useHeroCarousel = heroSlides.length > 0;
  return (
    <div className="flex flex-col">
      {/* Full-bleed hero */}
      {useHeroCarousel ? (
        <HeroImageCarousel slides={heroSlides} />
      ) : (
        <CinematicVideoHero src={videoSrc} poster={videoPoster} />
      )}

      <div className="flex flex-col gap-y-16 md:gap-y-24 pt-16 md:pt-24">
        <SiteContainer className="flex flex-col gap-y-16 md:gap-y-24">
          <LandingMotto />
          <ProductCarousel products={shopAll} title="SHOP ALL" showSaleBadge />
        </SiteContainer>

        {landingCategories
          .filter((cat) => cat.productCount > 0)
          .map((cat) => (
          <div key={cat.id} className="contents">
            <CategoryBanner
              imageSrc={cat.bannerImageUrl ?? DEFAULT_BANNER_IMAGE}
              imageAlt={cat.name}
            />
            <SiteContainer className="flex flex-col gap-y-16 md:gap-y-24">
              <ProductCarousel
                products={productsBySlug[cat.slug] ?? []}
                title={cat.name.toUpperCase()}
              />
            </SiteContainer>
          </div>
        ))}

        <SiteContainer className="flex flex-col gap-y-16 md:gap-y-24">
          <FeatureStrip />
        </SiteContainer>
      </div>
    </div>
  );
}
