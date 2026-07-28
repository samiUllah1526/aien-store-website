/**
 * Customer Spotlight — premium medium-card carousel of admin-uploaded images/reels.
 * Videos with autoplay play muted inline (no play button / lightbox).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import MediaLightbox, { type LightboxMediaItem } from '../MediaLightbox';

export interface SpotlightItem {
  id: string;
  caption: string | null;
  /** Videos: muted inline autoplay. Default true from API. */
  autoplay?: boolean;
  media: {
    id: string;
    url: string;
    mimeType: string;
    kind: 'image' | 'video';
  };
}

function isAutoplayVideo(item: SpotlightItem): boolean {
  return item.media.kind === 'video' && item.autoplay !== false;
}

export default function CustomerSpotlightCarousel({
  items,
  eyebrow = 'IN THE WILD',
  title = 'Customer Spotlight',
}: {
  items: SpotlightItem[];
  eyebrow?: string;
  title?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openableItems = items.filter((item) => !isAutoplayVideo(item));
  const lightboxItems: LightboxMediaItem[] = openableItems.map((item) => ({
    id: item.media.id,
    url: item.media.url,
    mimeType: item.media.mimeType,
    kind: item.media.kind,
  }));

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
  }, [updateScrollState, items.length]);

  // Play/pause autoplay videos when they enter/leave the viewport.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const videos = root.querySelectorAll<HTMLVideoElement>('video[data-autoplay="true"]');
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            void video.play().catch(() => {
              /* autoplay may be blocked; muted+playsInline usually works */
            });
          } else {
            video.pause();
          }
        }
      },
      { root: null, threshold: [0, 0.35, 0.6] },
    );

    videos.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, [items]);

  const scrollByDirection = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-spotlight-card="true"]');
    const delta = (card?.offsetWidth ?? 280) + 20;
    el.scrollBy({ left: dir * delta, behavior: 'smooth' });
  };

  const openItem = (item: SpotlightItem) => {
    if (isAutoplayVideo(item)) return;
    const idx = openableItems.findIndex((i) => i.id === item.id);
    if (idx < 0) return;
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  if (!items.length) return null;

  return (
    <section
      className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 pt-20 md:pt-24"
      aria-label={title}
    >
      <header className="mb-12 md:mb-14">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        <h2 className="font-serif text-h2-editorial-sm lg:text-h2-editorial text-on-background">
          {title}
        </h2>
      </header>

      <div className="relative group/spotlight">
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
        >
          {items.map((item) => {
            const autoplay = isAutoplayVideo(item);
            const mediaShellClass =
              'group/card relative block w-full aspect-[3/4] overflow-hidden bg-surface-container-low text-left';

            const mediaInner = (
              <>
                {item.media.kind === 'video' ? (
                  <>
                    <video
                      src={item.media.url}
                      muted
                      playsInline
                      loop={autoplay}
                      autoPlay={autoplay}
                      preload={autoplay ? 'auto' : 'metadata'}
                      data-autoplay={autoplay ? 'true' : undefined}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.03]"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />
                    {!autoplay && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur-sm transition-transform duration-300 group-hover/card:scale-105">
                          <svg className="h-5 w-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <img
                      src={item.media.url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.03]"
                      loading="lazy"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
                  </>
                )}
                {item.caption?.trim() && (
                  <span className="absolute bottom-0 inset-x-0 p-4 text-sm text-white/95 font-medium tracking-wide">
                    {item.caption.trim()}
                  </span>
                )}
              </>
            );

            return (
              <article
                key={item.id}
                role="listitem"
                data-spotlight-card="true"
                className="snap-start shrink-0 w-[min(72vw,16.5rem)] sm:w-[18rem] md:w-[19.5rem]"
              >
                {autoplay ? (
                  <div
                    className={mediaShellClass}
                    aria-label={item.caption?.trim() || 'Customer spotlight reel'}
                  >
                    {mediaInner}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`${mediaShellClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50`}
                    aria-label={
                      item.caption?.trim()
                        ? item.caption.trim()
                        : item.media.kind === 'video'
                          ? 'Play spotlight reel'
                          : 'View spotlight image'
                    }
                  >
                    {mediaInner}
                  </button>
                )}
              </article>
            );
          })}
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous spotlight"
              onClick={() => scrollByDirection(-1)}
              disabled={!canScrollLeft}
              className="absolute left-0 sm:-left-2 top-[42%] -translate-y-1/2 z-10 h-10 w-10 rounded-full border border-off-white/50 dark:border-off-white/20 bg-bone/90 dark:bg-charcoal/85 backdrop-blur-md text-soft-charcoal dark:text-off-white shadow-md transition-all duration-300 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50 opacity-100 sm:opacity-0 sm:group-hover/spotlight:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next spotlight"
              onClick={() => scrollByDirection(1)}
              disabled={!canScrollRight}
              className="absolute right-0 sm:-right-2 top-[42%] -translate-y-1/2 z-10 h-10 w-10 rounded-full border border-off-white/50 dark:border-off-white/20 bg-bone/90 dark:bg-charcoal/85 backdrop-blur-md text-soft-charcoal dark:text-off-white shadow-md transition-all duration-300 flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50 opacity-100 sm:opacity-0 sm:group-hover/spotlight:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {lightboxItems.length > 0 && (
        <MediaLightbox
          open={lightboxOpen}
          items={lightboxItems}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </section>
  );
}
