/**
 * Home page: fetches data client-side. Static shell, no build-time API dependency.
 */

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../lib/api';

interface HomePageProps {
  videoSrc?: string;
  videoPoster?: string;
}
import CinematicVideoHero from './CinematicVideoHero';
import BrandManifesto from './BrandManifesto';
import ProductCarousel from './ProductCarousel';
import AnimatedPoetrySection from './AnimatedPoetrySection';

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
}

function mapProduct(p: Record<string, unknown>, baseUrl: string): Product {
  const img = p.image as string;
  return {
    id: String(p.id),
    slug: String(p.slug),
    name: String(p.name),
    price: Number(p.price),
    currency: String(p.currency ?? 'PKR'),
    image: img ? (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`) : '',
    urduVerse: (p.urduVerse as string | null) ?? null,
    urduVerseTransliteration: (p.urduVerseTransliteration as string | null) ?? null,
    description: (p.description as string | null) ?? null,
    sizes: (p.sizes as string[] | undefined) ?? undefined,
  };
}

export default function HomePage({ videoSrc = '/videos/hero.mp4', videoPoster }: HomePageProps) {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [collection, setCollection] = useState<Product[]>([]);

  useEffect(() => {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    let cancelled = false;

    async function load() {
      try {
        const [featuredRes, collectionRes] = await Promise.all([
          fetch(`${baseUrl}/products?featured=true&limit=20`),
          fetch(`${baseUrl}/products?limit=12`),
        ]);
        if (cancelled) return;

        const featuredJson = await featuredRes.json();
        if (featuredRes.ok && featuredJson?.success && Array.isArray(featuredJson.data)) {
          setFeatured(featuredJson.data.map((p: Record<string, unknown>) => mapProduct(p, baseUrl)));
        }

        const collectionJson = await collectionRes.json();
        if (collectionRes.ok && collectionJson?.success && Array.isArray(collectionJson.data)) {
          const mapped = collectionJson.data.map((p: Record<string, unknown>) => mapProduct(p, baseUrl));
          setCollection(mapped);
          setFeatured((prev) => (prev.length === 0 ? mapped : prev));
        }
      } catch {
        // silent
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const displayFeatured = featured.length > 0 ? featured : collection;

  return (
    <>
      <CinematicVideoHero src={videoSrc} poster={videoPoster} />
      <BrandManifesto />
      <ProductCarousel products={displayFeatured} title="Featured" />
      <AnimatedPoetrySection />
      <ProductCarousel products={collection} title="Collection" />
    </>
  );
}
