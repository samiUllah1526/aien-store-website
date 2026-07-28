/**
 * Homepage featured reviews — horizontal testimonials carousel.
 * Only renders when admin-featured (approved) reviews are provided at build time.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface FeaturedReview {
  id: string;
  productId: string;
  productName: string | null;
  productSlug: string | null;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  isVerified: boolean;
  createdAt: string;
}

function Stars({ value }: { value: number }) {
  const n = Math.max(0, Math.min(5, value));
  return (
    <span className="text-mehndi tracking-wide" aria-label={`${n} out of 5 stars`}>
      {'★'.repeat(n)}
      <span className="text-on-surface-variant/35">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

function truncate(text: string, max = 180): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export default function FeaturedReviewsCarousel({
  reviews,
  eyebrow = 'CUSTOMER LOVE',
  title = 'What they say',
}: {
  reviews: FeaturedReview[];
  eyebrow?: string;
  title?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, reviews.length]);

  const scrollByDirection = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-review-card="true"]');
    const delta = (card?.offsetWidth ?? 320) + 24;
    el.scrollBy({ left: dir * delta, behavior: 'smooth' });
  };

  if (!reviews.length) return null;

  return (
    <section
      className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-20 md:pt-24"
      aria-label={title}
    >
      <header className="mb-12 md:mb-16">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h2 className="font-serif text-h2-editorial-sm lg:text-h2-editorial text-on-background">
          {title}
        </h2>
      </header>

      <div className="relative group/reviews">
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {reviews.map((review) => (
            <article
              key={review.id}
              role="listitem"
              data-review-card="true"
              className="snap-start shrink-0 w-[min(100%,20rem)] sm:w-[22rem] border-t border-on-surface/15 pt-6 flex flex-col"
            >
              <Stars value={review.rating} />
              {review.title?.trim() && (
                <h3 className="mt-4 font-serif text-lg text-on-background leading-snug">
                  {review.title.trim()}
                </h3>
              )}
              <p className="mt-3 font-serif text-body-lg text-on-surface leading-relaxed flex-1">
                “{truncate(review.body)}”
              </p>
              <footer className="mt-6 pt-4 border-t border-on-surface/10">
                <p className="text-sm text-on-background font-medium">{review.authorName}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-on-surface-variant">
                  {review.isVerified && <span>Verified purchase</span>}
                  {review.productSlug && review.productName && (
                    <>
                      {review.isVerified && <span aria-hidden>·</span>}
                      <a
                        href={`/shop/${review.productSlug}`}
                        className="link-underline"
                      >
                        {review.productName}
                      </a>
                    </>
                  )}
                </p>
              </footer>
            </article>
          ))}
        </div>

        {reviews.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous reviews"
              onClick={() => scrollByDirection(-1)}
              disabled={!canScrollLeft}
              className="absolute left-0 sm:-left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border border-off-white/50 dark:border-off-white/20 bg-bone/90 dark:bg-charcoal/85 backdrop-blur-md text-soft-charcoal dark:text-off-white shadow-md transition-all duration-300 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50 opacity-100 sm:opacity-0 sm:group-hover/reviews:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next reviews"
              onClick={() => scrollByDirection(1)}
              disabled={!canScrollRight}
              className="absolute right-0 sm:-right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full border border-off-white/50 dark:border-off-white/20 bg-bone/90 dark:bg-charcoal/85 backdrop-blur-md text-soft-charcoal dark:text-off-white shadow-md transition-all duration-300 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50 opacity-100 sm:opacity-0 sm:group-hover/reviews:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
