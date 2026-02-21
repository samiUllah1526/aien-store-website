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
  urduVerse?: string | null;
  description?: string | null;
}

export default function ProductCarousel({
  products,
  title,
}: {
  products: CarouselProduct[];
  title?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const dragStart = useRef(0);
  const scrollStart = useRef(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(
      el.scrollLeft < el.scrollWidth - el.clientWidth - 10
    );
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
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStart.current = x;
    scrollStart.current = scrollRef.current?.scrollLeft ?? 0;
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const delta = dragStart.current - x;
    scrollRef.current.scrollLeft = scrollStart.current + delta;
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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
    <section className="py-20 md:py-28" aria-label={title ?? 'Products'}>
      {title && (
        <div className="px-4 sm:px-6 mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display text-2xl md:text-3xl text-soft-charcoal dark:text-off-white"
          >
            {title}
          </motion.h2>
        </div>
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory flex gap-6 md:gap-10 pl-4 sm:pl-6 pr-4 sm:pr-6 cursor-grab active:cursor-grabbing select-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
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
            onClick={(e) => isDragging && e.preventDefault()}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              duration: 0.8,
              delay: i * 0.1,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="flex-shrink-0 w-[75vw] sm:w-[55vw] md:w-[42vw] snap-center group"
            onMouseEnter={() => setHoveredId(product.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-ash/10 relative">
              <motion.img
                src={product.image}
                alt=""
                className="w-full h-full object-cover"
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
              <p className="text-ash text-sm mt-1">
                {formatMoney(product.price, product.currency)}
              </p>
            </div>
          </motion.a>
        ))}
      </div>
      <div className="mt-12 px-4 sm:px-6 text-center">
        <motion.a
          href="/shop"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="inline-block font-display text-sm text-ash hover:text-soft-charcoal dark:hover:text-off-white transition-colors duration-300"
        >
          Continue reading →
        </motion.a>
      </div>
    </section>
  );
}
