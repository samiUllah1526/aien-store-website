/**
 * Product image carousel: main image with prev/next, thumbnails below.
 * Clicking a thumbnail updates the main image. Smooth transitions, responsive.
 */

import { useState, useCallback } from 'react';

export interface ProductImageCarouselProps {
  /** Full image URLs (from API). At least one recommended. */
  images: string[];
  /** Alt text for the main image (e.g. product name). */
  alt: string;
  /** Optional class for the outer container. */
  className?: string;
}

export default function ProductImageCarousel({
  images,
  alt,
  className = '',
}: ProductImageCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const list = images.length > 0 ? images : [];
  const mainSrc = list[selectedIndex] ?? '';

  const goPrev = useCallback(() => {
    setSelectedIndex((i) => (i <= 0 ? list.length - 1 : i - 1));
  }, [list.length]);

  const goNext = useCallback(() => {
    setSelectedIndex((i) => (i >= list.length - 1 ? 0 : i + 1));
  }, [list.length]);

  if (list.length === 0) {
    return (
      <div
        className={`aspect-[3/4] w-full rounded-xl bg-sand dark:bg-charcoal-light flex items-center justify-center text-charcoal/50 dark:text-cream/50 ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-sm">No image</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Main image + arrows */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-sand dark:bg-charcoal-light shadow-soft">
        <img
          key={selectedIndex}
          src={mainSrc}
          alt={`${alt} — image ${selectedIndex + 1} of ${list.length}`}
          className="absolute inset-0 h-full w-full object-cover animate-fade-in"
        />
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-charcoal/90 text-charcoal dark:text-cream shadow-md hover:bg-white dark:hover:bg-charcoal focus:outline-none focus:ring-2 focus:ring-emerald/50 transition-colors"
              aria-label="Previous image"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-charcoal/90 text-charcoal dark:text-cream shadow-md hover:bg-white dark:hover:bg-charcoal focus:outline-none focus:ring-2 focus:ring-emerald/50 transition-colors"
              aria-label="Next image"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="tablist" aria-label="Product images">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setSelectedIndex(i)}
              role="tab"
              aria-selected={i === selectedIndex}
              aria-label={`View image ${i + 1}`}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-charcoal ${
                i === selectedIndex
                  ? 'border-ink dark:border-cream ring-1 ring-ink/20 dark:ring-cream/20'
                  : 'border-transparent hover:border-charcoal/30 dark:hover:border-cream/30'
              }`}
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
