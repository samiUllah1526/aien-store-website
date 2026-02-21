/**
 * Cinematic hero: muted, looping video with soft gradient overlay and Urdu line.
 * Pauses on prefers-reduced-motion. Optional mobile fallback (poster only).
 * Pass video src from your CDN (fabric, calligraphy, or apparel).
 */

import { useState, useEffect, useRef } from 'react';

interface VideoHeroProps {
  /** Video URL (e.g. fabric movement, calligraphy). Required for video; omit for static hero. */
  src?: string;
  /** Poster image URL for mobile fallback or when video unavailable. */
  poster?: string;
  /** Urdu poetic line overlaid on the video. */
  overlayText: string;
  /** Optional transliteration or subtitle. */
  overlaySubtext?: string;
  /** When true, never play video (e.g. mobile data save). Renders poster + overlay only. */
  mobileFallback?: boolean;
}

export default function VideoHero({
  src,
  poster,
  overlayText,
  overlaySubtext,
  mobileFallback = false,
}: VideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (mobileFallback && typeof window !== 'undefined') {
      setUseFallback(window.innerWidth < 768);
      const mql = window.matchMedia('(max-width: 767px)');
      const handler = () => setUseFallback(mql.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, [mobileFallback]);

  const shouldPlayVideo = Boolean(src && !reducedMotion && !useFallback);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldPlayVideo) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [shouldPlayVideo]);

  return (
    <section
      className="relative w-full min-h-[70vh] md:min-h-[85vh] flex flex-col justify-center items-center overflow-hidden"
      aria-label="Hero"
    >
      {/* Background: video when playing, poster or gradient when not */}
      {src && !useFallback && !reducedMotion && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden
        />
      )}
      {(useFallback || reducedMotion) && src && poster && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${poster})` }}
          aria-hidden
        />
      )}
      {(!src || ((useFallback || reducedMotion) && !poster)) && (
        <div
          className="absolute inset-0 w-full h-full bg-gradient-to-b from-sand/80 dark:from-charcoal/90 to-charcoal/20 dark:to-ink/80"
          aria-hidden
        />
      )}

      {/* Soft gradient overlay for readability */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/30 to-transparent pointer-events-none"
        aria-hidden
      />

      {/* Urdu line + subtext */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="urdu-text font-urdu text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-cream leading-relaxed drop-shadow-sm">
          {overlayText}
        </p>
        {overlaySubtext && (
          <p className="mt-4 text-cream/90 text-sm sm:text-base max-w-md mx-auto">
            {overlaySubtext}
          </p>
        )}
      </div>
    </section>
  );
}
