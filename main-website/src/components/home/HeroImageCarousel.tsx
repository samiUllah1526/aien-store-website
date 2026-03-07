/**
 * Hero image carousel: full-width, full-aesthetic, modern.
 * Fade transition, arrows, dots, autoplay. Respects prefers-reduced-motion.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeroSlide } from '../../config';

const AUTO_INTERVAL_MS = 5000;
const TRANSITION_DURATION = 0.6;

interface HeroImageCarouselProps {
  slides: HeroSlide[];
  /** When true, auto-advance is disabled. */
  reducedMotion?: boolean;
}

export default function HeroImageCarousel({ slides, reducedMotion = false }: HeroImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

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
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
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

  const current = slides[index];

  return (
    <section
      className="relative w-full aspect-video min-h-[280px] max-h-[85vh] flex flex-col justify-center overflow-hidden"
      aria-label="Hero carousel"
      aria-roledescription="carousel"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: TRANSITION_DURATION, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0"
          >
            <img
              src={current.src}
              alt={current.alt ?? ''}
              className="w-full h-full object-cover object-center"
              fetchPriority="high"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle gradient overlay for readability of controls */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-charcoal/20 pointer-events-none"
        aria-hidden
      />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(-1)}
            aria-label="Previous slide"
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-off-white/90 dark:bg-charcoal/90 text-soft-charcoal dark:text-off-white hover:bg-off-white dark:hover:bg-charcoal transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-mehndi/50"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => goTo(1)}
            aria-label="Next slide"
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-off-white/90 dark:bg-charcoal/90 text-soft-charcoal dark:text-off-white hover:bg-off-white dark:hover:bg-charcoal transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-mehndi/50"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div
            className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10"
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
                className={`rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-mehndi/50 ${
                  i === index
                    ? 'w-8 h-2 bg-off-white'
                    : 'w-2 h-2 bg-off-white/50 hover:bg-off-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Optional scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-10 hidden sm:block"
        aria-hidden
      >
        <motion.span
          className="block w-px h-10 bg-off-white/80"
          animate={{ scaleY: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}
