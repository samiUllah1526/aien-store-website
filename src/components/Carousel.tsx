/**
 * Premium landing carousel: featured products + Urdu poetry slides.
 * Auto-play (slow), manual arrows, subtle fade transition. No loud indicators.
 * Respects prefers-reduced-motion (no auto-advance when reduced).
 */

import { useState, useEffect, useCallback } from 'react';

export type CarouselSlideProduct = {
  type: 'product';
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  image: string;
};

export type CarouselSlidePoetry = {
  type: 'poetry';
  id: string;
  urdu: string;
  transliteration?: string;
};

export type CarouselSlide = CarouselSlideProduct | CarouselSlidePoetry;

const AUTO_INTERVAL_MS = 6000;
const TRANSITION_MS = 500;

interface CarouselProps {
  slides: CarouselSlide[];
  /** When true, auto-advance is disabled (e.g. prefers-reduced-motion). */
  reducedMotion?: boolean;
}

export default function Carousel({ slides, reducedMotion = false }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const count = slides.length;
  const effectiveReduced = reducedMotion || prefersReducedMotion;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (count <= 1) return;
      setIsTransitioning(true);
      setIndex((i) => (i + next + count) % count);
      setTimeout(() => setIsTransitioning(false), TRANSITION_MS);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1 || effectiveReduced) return;
    const id = setInterval(() => goTo(1), AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [count, effectiveReduced, goTo]);

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart == null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(dx) > 50) goTo(dx > 0 ? -1 : 1);
    setTouchStart(null);
  };

  if (count === 0) return null;

  const slide = slides[index];

  // Fixed height container to prevent layout shift when switching between product (tall) and poetry (shorter) slides
  const slideMinHeight = 'min-h-[420px] sm:min-h-[480px] md:min-h-[520px]';

  return (
    <section
      className="relative w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className={`w-full ${slideMinHeight} flex flex-col justify-center`}>
        <div
          className="flex transition-opacity duration-300 ease-out"
          style={{ opacity: isTransitioning ? 0.97 : 1 }}
        >
          {slide.type === 'product' ? (
            <div className="w-full flex-shrink-0 px-4 sm:px-6">
              <a
                href={`/shop/${slide.slug}`}
                className="group block max-w-2xl mx-auto"
              >
                <div className="aspect-[3/4] max-h-[360px] sm:max-h-[400px] md:max-h-[440px] mx-auto overflow-hidden rounded-lg bg-sand dark:bg-charcoal-light shadow-soft">
                  <img
                    src={slide.image}
                    alt=""
                    className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                </div>
                <p className="mt-4 font-display text-xl md:text-2xl text-ink dark:text-cream group-hover:text-emerald transition-colors text-center">
                  {slide.name}
                </p>
                <p className="mt-1 text-charcoal/70 dark:text-cream/70 text-sm text-center">
                  {slide.currency} {slide.price.toLocaleString()}
                </p>
              </a>
            </div>
          ) : (
            <div className="w-full flex-shrink-0 flex flex-col justify-center items-center px-6 py-12 text-center">
              <blockquote className="urdu-text font-urdu text-2xl sm:text-3xl md:text-4xl text-ink dark:text-cream leading-relaxed max-w-2xl">
                {slide.urdu}
              </blockquote>
              {slide.transliteration && (
                <p className="mt-4 text-charcoal/70 dark:text-cream/60 text-sm italic max-w-xl">
                  {slide.transliteration}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(-1)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-cream/90 dark:bg-ink/90 text-charcoal dark:text-cream hover:text-emerald transition-colors shadow-soft focus:outline-none focus:ring-2 focus:ring-emerald/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(1)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-cream/90 dark:bg-ink/90 text-charcoal dark:text-cream hover:text-emerald transition-colors shadow-soft focus:outline-none focus:ring-2 focus:ring-emerald/50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {/* Minimal dots – single row, small */}
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
            role="tablist"
            aria-label="Slide indicators"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                onClick={() => {
                  setIndex(i);
                  setIsTransitioning(true);
                  setTimeout(() => setIsTransitioning(false), TRANSITION_MS);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? 'w-6 bg-emerald'
                    : 'w-1.5 bg-charcoal/30 dark:bg-cream/30 hover:bg-charcoal/50 dark:hover:bg-cream/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
