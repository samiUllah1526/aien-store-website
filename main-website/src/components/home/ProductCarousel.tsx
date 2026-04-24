/**
 * Horizontal scroll product carousel.
 * One large product in focus, next partially visible.
 * Drag-to-scroll, hover reveals Urdu verse + subtle zoom.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { formatMoney } from '../../lib/formatMoney';

export interface CarouselProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  /** Fallback when `image` is empty (e.g. shop list that keeps primary vs variant separate). */
  variantImage?: string;
  urduVerse?: string | null;
  description?: string | null;
  /** When set, show sale badge and strikethrough original price. */
  compareAtPrice?: number | null;
  /** Custom badge text from sales campaign (e.g. "EID SALE", "30% OFF"). */
  saleBadgeText?: string | null;
}

export default function ProductCarousel({
  products,
  title,
  showSaleBadge = false,
}: {
  products: CarouselProduct[];
  title?: string;
  /** When true, show "SALE 30% OFF" on first N items if compareAtPrice set, else generic badge. */
  showSaleBadge?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const scrollStart = useRef(0);
  /** Touch only: once movement exceeds threshold, lock to horizontal carousel drag or vertical page scroll. */
  const touchAxis = useRef<'none' | 'horizontal' | 'vertical'>('none');

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
    el.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, products.length]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    touchAxis.current = 'none';
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartX.current = x;
    dragStartY.current = y;
    scrollStart.current = scrollRef.current?.scrollLeft ?? 0;
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;

    if ('touches' in e) {
      const touch = e.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      const adx = Math.abs(x - dragStartX.current);
      const ady = Math.abs(y - dragStartY.current);

      if (touchAxis.current === 'none' && (adx > 10 || ady > 10)) {
        touchAxis.current = adx > ady ? 'horizontal' : 'vertical';
        if (touchAxis.current === 'horizontal') {
          scrollStart.current = scrollRef.current.scrollLeft;
          dragStartX.current = x;
        }
      }
      if (touchAxis.current === 'vertical') {
        return;
      }
      if (touchAxis.current === 'horizontal') {
        e.preventDefault();
        scrollRef.current.scrollLeft = scrollStart.current + (dragStartX.current - x);
      }
      return;
    }

    e.preventDefault();
    scrollRef.current.scrollLeft = scrollStart.current + (dragStartX.current - e.clientX);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    touchAxis.current = 'none';
  };

  const scrollByDirection = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>('[data-carousel-item="true"]');
    const cardWidth = firstCard?.getBoundingClientRect().width ?? el.clientWidth * 0.82;
    const styles = window.getComputedStyle(el);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
    el.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onMouseUp = () => handleDragEnd();
    const onMouseLeave = () => handleDragEnd();
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseleave', onMouseLeave);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  if (products.length === 0) return null;

  return (
    <section aria-label={title ?? 'Products'}>
      {title && (
        <div className="mb-8 sm:mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display text-xl sm:text-2xl md:text-3xl text-soft-charcoal dark:text-off-white"
          >
            {title}
          </motion.h2>
        </div>
      )}
      <div className="relative group/carousel">
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory flex gap-4 sm:gap-6 md:gap-10 cursor-grab active:cursor-grabbing select-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-x pan-y',
          }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {products.map((product, i) => (
            <motion.a
              key={product.id}
              href={`/shop/${product.slug}`}
              data-carousel-item="true"
              onClick={(e) => isDragging && e.preventDefault()}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="flex-shrink-0 w-[75vw] sm:w-[55vw] md:w-[42vw] max-w-[280px] sm:max-w-[320px] md:max-w-[360px] snap-center group min-w-0"
              onMouseEnter={() => setHoveredId(product.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
            <div className="aspect-[4/5] overflow-hidden rounded-xl bg-ash/10 relative">
              {showSaleBadge && product.compareAtPrice != null && product.compareAtPrice > product.price && (
                <span className="absolute left-3 top-3 z-10 rounded bg-red-600 text-white text-xs font-semibold px-2 py-1">
                  {product.saleBadgeText ?? `${Math.round((1 - product.price / product.compareAtPrice) * 100)}% Save`}
                </span>
              )}
              <motion.img
                src={product.image || product.variantImage}
                alt=""
                className="w-full h-full object-cover object-center"
                animate={{
                  scale: hoveredId === product.id ? 1.04 : 1,
                }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
              <motion.div
                className="absolute inset-0 bg-charcoal/85 flex flex-col justify-center items-center p-6 text-center"
                initial={false}
                animate={{
                  opacity: hoveredId === product.id ? 1 : 0,
                }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                aria-hidden
              >
                {product.urduVerse && (
                  <p className="urdu-text text-xl md:text-2xl lg:text-3xl text-off-white leading-loose">
                    {product.urduVerse}
                  </p>
                )}
                {product.description && (
                  <p className="text-off-white/75 text-sm max-w-xs mt-4 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </motion.div>
            </div>
            <div className="mt-4">
              <p className="font-display text-lg text-soft-charcoal dark:text-off-white">
                {product.name}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                {product.compareAtPrice != null && product.compareAtPrice > product.price && (
                  <span className="text-ash line-through text-sm">
                    {formatMoney(product.compareAtPrice, product.currency)}
                  </span>
                )}
                <p className="text-ash text-sm">
                  {formatMoney(product.price, product.currency)}
                </p>
              </div>
            </div>
            </motion.a>
          ))}
        </div>
        <button
          type="button"
          aria-label="Previous products"
          onClick={() => scrollByDirection(-1)}
          disabled={!canScrollLeft}
          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-off-white/50 dark:border-off-white/20 bg-bone/90 dark:bg-charcoal/85 backdrop-blur-md text-soft-charcoal dark:text-off-white shadow-md transition-all duration-300 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50 opacity-100 sm:opacity-0 sm:group-hover/carousel:opacity-100"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next products"
          onClick={() => scrollByDirection(1)}
          disabled={!canScrollRight}
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-off-white/50 dark:border-off-white/20 bg-bone/90 dark:bg-charcoal/85 backdrop-blur-md text-soft-charcoal dark:text-off-white shadow-md transition-all duration-300 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50 opacity-100 sm:opacity-0 sm:group-hover/carousel:opacity-100"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="mt-12 text-center">
        <motion.a
          href="/shop"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="inline-block font-display text-sm text-ash hover:text-soft-charcoal dark:hover:text-off-white transition-colors duration-300"
        >
          View all
        </motion.a>
      </div>
    </section>
  );
}
