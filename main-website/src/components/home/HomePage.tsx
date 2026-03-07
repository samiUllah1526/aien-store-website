/**
 * Home page: landing layout per e-commerce reference.
 * Hero carousel, motto, SHOP ALL, category banners, BEGGY TEES, HOODIES, feature strip.
 */

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../lib/api';

import type { HeroSlide } from '../../config';
import { categoryBannerImages } from '../../config';
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

export default function HomePage({ videoSrc = '/videos/hero.mp4', videoPoster, heroSlides = [] }: HomePageProps) {
  const [shopAll, setShopAll] = useState<Product[]>([]);
  const [beggyTees, setBeggyTees] = useState<Product[]>([]);
  const [hoodies, setHoodies] = useState<Product[]>([]);

  useEffect(() => {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    let cancelled = false;

    async function load() {
      try {
        const [allRes, teesRes, hoodiesRes] = await Promise.all([
          fetch(`${baseUrl}/products?limit=20`),
          fetch(`${baseUrl}/products?category=beggy-tees&limit=12`),
          fetch(`${baseUrl}/products?category=hoodies&limit=12`),
        ]);
        if (cancelled) return;

        const allJson = await allRes.json();
        const allList = allRes.ok && allJson?.success && Array.isArray(allJson.data)
          ? allJson.data.map((p: Record<string, unknown>) => mapProduct(p, baseUrl))
          : [];

        const teesJson = await teesRes.json();
        const teesList = teesRes.ok && teesJson?.success && Array.isArray(teesJson.data) && teesJson.data.length > 0
          ? teesJson.data.map((p: Record<string, unknown>) => mapProduct(p, baseUrl))
          : allList;

        const hoodiesJson = await hoodiesRes.json();
        const hoodiesList = hoodiesRes.ok && hoodiesJson?.success && Array.isArray(hoodiesJson.data) && hoodiesJson.data.length > 0
          ? hoodiesJson.data.map((p: Record<string, unknown>) => mapProduct(p, baseUrl))
          : allList;

        setShopAll(allList);
        setBeggyTees(teesList);
        setHoodies(hoodiesList);
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

        {/* Full-bleed category banner */}
        <CategoryBanner
          smallTitle="PREMIUM T-SHIRTS"
          largeTitle="BEGGY"
          saleText="SALE 30% OFF"
          imageSrc={categoryBannerImages.tees}
          imageAlt="Premium Beggy tees"
        />

        <SiteContainer className="flex flex-col gap-y-16 md:gap-y-24">
          <ProductCarousel products={beggyTees} title="BEGGY TEES" />
        </SiteContainer>

        {/* Full-bleed category banner */}
        <CategoryBanner
          smallTitle="PREMIUM COLLECTION"
          largeTitle="HOODIE"
          saleText="SALE 30% OFF"
          imageSrc={categoryBannerImages.hoodie}
          imageAlt="Premium hoodies"
        />

        <SiteContainer className="flex flex-col gap-y-16 md:gap-y-24">
          <ProductCarousel products={hoodies} title="HOODIES" />
          <FeatureStrip />
        </SiteContainer>
      </div>
    </div>
  );
}
