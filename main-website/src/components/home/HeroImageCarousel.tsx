/**
 * Editorial hero — full-bleed photographic stage with display title overlay.
 * When more than one slide is provided, a fade carousel auto-advances and a
 * minimal indicator row appears. Honors prefers-reduced-motion.
 *
 * Slide data shape (`HeroSlide`) is preserved so the Astro page wiring in
 * `src/pages/index.astro` continues to work unchanged.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeroSlide } from '../../config';
import { brandName } from '../../config';

const AUTO_INTERVAL_MS = 6500;
const FADE_DURATION = 0.9;

interface HeroImageCarouselProps {
  slides: HeroSlide[];
  /** Eyebrow above the headline. */
  eyebrow?: string;
  /** Display headline (uses serif h1-display). */
  headline?: string;
  /** CTA destination — defaults to /shop. */
  ctaHref?: string;
  ctaLabel?: string;
  reducedMotion?: boolean;
}

export default function HeroImageCarousel({
  slides,
  eyebrow = 'NEW SEASON RELEASE',
  headline = 'The Geometry of Silence',
  ctaHref = '/shop',
  ctaLabel = 'Explore Collection',
  reducedMotion = false,
}: HeroImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const count = slides.length;
  const effectiveReduced = reducedMotion || prefersReduced;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setPrefersReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const goTo = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || effectiveReduced) return;
    const id = setInterval(() => goTo(1), AUTO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [count, effectiveReduced, goTo]);

  if (count === 0) {
    // Editorial fallback so the homepage never renders empty.
    return (
      <section className="relative w-full h-[70vh] min-h-[520px] bg-surface-container-low flex items-center justify-center">
        <div className="text-center px-6">
          <p className="eyebrow mb-6">{eyebrow}</p>
          <h1 className="font-serif text-h1-display text-on-background max-w-2xl mx-auto mb-10">
            {headline}
          </h1>
          <a href={ctaHref} className="btn-primary">{ctaLabel}</a>
        </div>
      </section>
    );
  }

  const current = slides[index];

  return (
    <section
      className="relative w-full h-[80vh] min-h-[520px] max-h-[920px] overflow-hidden bg-surface-container-low"
      aria-label={`${brandName} hero`}
      aria-roledescription="carousel"
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart == null) return;
        const dx = e.changedTouches[0].clientX - touchStart;
        if (Math.abs(dx) > 50) goTo(dx > 0 ? -1 : 1);
        setTouchStart(null);
      }}
    >
      <div className="absolute inset-0">
        <AnimatePresence initial={false} mode="wait">
          <motion.img
            key={index}
            src={current.src}
            alt={current.alt ?? ''}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_DURATION, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full h-full object-cover object-center"
            fetchPriority="high"
            draggable={false}
          />
        </AnimatePresence>
      </div>

      {/* Editorial scrim — keeps text legible without flattening the image. */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="relative h-full max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 flex flex-col justify-center items-start">
        <motion.span
          key={`eyebrow-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="font-sans text-label-caps text-white mb-6"
        >
          {eyebrow}
        </motion.span>
        <motion.h1
          key={`headline-${index}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="font-serif text-h1-display text-white max-w-3xl mb-12"
        >
          {headline}
        </motion.h1>
        <motion.a
          key={`cta-${index}`}
          href={ctaHref}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="bg-white text-primary px-12 py-5 font-sans text-button uppercase tracking-widest hover:bg-secondary-container transition-colors duration-300"
        >
          {ctaLabel}
        </motion.a>
      </div>

      {count > 1 && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10"
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
              onClick={() => setIndex(i)}
              className={`h-px transition-all duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                i === index ? 'w-12 bg-white' : 'w-6 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
