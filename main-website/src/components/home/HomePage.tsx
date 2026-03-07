/**
 * Home page: landing layout per e-commerce reference.
 * Hero carousel, motto, SHOP ALL, category banners (from backend), feature strip.
 */

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../lib/api';

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
}

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  urduVerse?: string | null;
  urduVerseTransliteration?: string | null;
  description?: string | null;
  sizes?: string[];
  compareAtPrice?: number | null;
}

/** Landing category from GET /categories/landing */
interface LandingCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  bannerImageUrl: string | null;
  landingOrder: number | null;
  productCount: number;
}

function mapProduct(p: Record<string, unknown>, baseUrl: string): Product {
  const img = p.image as string;
  const price = Number(p.price);
  const compareAt = p.compareAtPrice != null ? Number(p.compareAtPrice) : null;
  return {
    id: String(p.id),
    slug: String(p.slug),
    name: String(p.name),
    price,
    currency: String(p.currency ?? 'PKR'),
    image: img ? (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`) : '',
    urduVerse: (p.urduVerse as string | null) ?? null,
    urduVerseTransliteration: (p.urduVerseTransliteration as string | null) ?? null,
    description: (p.description as string | null) ?? null,
    sizes: (p.sizes as string[] | undefined) ?? undefined,
    compareAtPrice: compareAt != null && !Number.isNaN(compareAt) ? compareAt : null,
  };
}

const DEFAULT_BANNER_IMAGE = 'https://picsum.photos/seed/category/600/750';

export default function HomePage({ videoSrc = '/videos/hero.mp4', videoPoster, heroSlides = [] }: HomePageProps) {
  const [shopAll, setShopAll] = useState<Product[]>([]);
  const [landingCategories, setLandingCategories] = useState<LandingCategory[]>([]);
  const [productsBySlug, setProductsBySlug] = useState<Record<string, Product[]>>({});

  useEffect(() => {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    let cancelled = false;

    async function load() {
      try {
        const [allRes, landingRes] = await Promise.all([
          fetch(`${baseUrl}/products?limit=20`),
          fetch(`${baseUrl}/categories/landing`),
        ]);
        if (cancelled) return;

        const allJson = await allRes.json();
        const allList = allRes.ok && allJson?.success && Array.isArray(allJson.data)
          ? allJson.data.map((p: Record<string, unknown>) => mapProduct(p, baseUrl))
          : [];
        setShopAll(allList);

        const landingJson = await landingRes.json();
        const categories: LandingCategory[] = landingRes.ok && landingJson?.success && Array.isArray(landingJson.data)
          ? landingJson.data
          : [];
        setLandingCategories(categories);

        if (categories.length > 0) {
          const productResList = await Promise.all(
            categories.map((c) => fetch(`${baseUrl}/products?category=${encodeURIComponent(c.slug)}&limit=12`)),
          );
          if (cancelled) return;
          const bySlug: Record<string, Product[]> = {};
          for (let i = 0; i < categories.length; i++) {
            const res = productResList[i];
            const json = await res.json();
            const list = res.ok && json?.success && Array.isArray(json.data)
              ? json.data.map((p: Record<string, unknown>) => mapProduct(p, baseUrl))
              : [];
            bySlug[categories[i].slug] = list;
          }
          setProductsBySlug(bySlug);
        }
      } catch {
        // silent
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

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
              smallTitle="COLLECTION"
              largeTitle={cat.name.toUpperCase()}
              saleText="SALE 30% OFF"
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
