/**
 * Cinematic hero: full-screen muted video loop, grainy/desaturated.
 * Supports: YouTube, Vimeo, or direct video URLs (mp4, webm, etc.).
 * Poster: any publicly available image URL.
 * Urdu poetry overlay: appears line-by-line — fade in → pause → fade out.
 * No CTA. Minimal scroll indicator only.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POETRY_LINES = [
  'عشق نے غلام بنایا اور ہم',
  'آزاد ہیں مگر وہیں کھڑے ہیں',
  'دل میں اک آگ سی لگی ہوئی ہے',
];

type VideoSource = 'youtube' | 'vimeo' | 'direct' | null;

function parseVideoUrl(url: string): { type: VideoSource; id?: string; embedUrl?: string } {
  if (!url?.trim()) return { type: null };

  const u = url.trim();

  // YouTube: youtu.be/xxx or youtube.com/watch?v=xxx
  const ytShort = u.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (ytShort) {
    return {
      type: 'youtube',
      id: ytShort[1],
      embedUrl: `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1&mute=1&loop=1&playlist=${ytShort[1]}&controls=0&showinfo=0&rel=0&modestbranding=1`,
    };
  }
  const ytWatch = u.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytWatch) {
    return {
      type: 'youtube',
      id: ytWatch[1],
      embedUrl: `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytWatch[1]}&controls=0&showinfo=0&rel=0&modestbranding=1`,
    };
  }

  // Vimeo: vimeo.com/xxx
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return {
      type: 'vimeo',
      id: vimeo[1],
      embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&loop=1&muted=1&background=1`,
    };
  }

  // Direct video (mp4, webm, ogg)
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u) || u.startsWith('blob:') || u.startsWith('data:')) {
    return { type: 'direct' };
  }

  return { type: null };
}

function getYouTubePoster(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

interface CinematicVideoHeroProps {
  /** Video URL: YouTube, Vimeo, or direct mp4/webm link */
  src?: string;
  /** Poster image: any publicly available image URL. For YouTube, auto-used if not provided. */
  poster?: string;
}

export default function CinematicVideoHero({ src, poster }: CinematicVideoHeroProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const { type, embedUrl, id } = useMemo(() => parseVideoUrl(src ?? ''), [src]);

  const effectivePoster = useMemo(() => {
    if (poster?.trim()) return poster.trim();
    if (type === 'youtube' && id) return getYouTubePoster(id);
    if (type === 'vimeo' && id) return `https://vumbnail.com/${id}.jpg`;
    return '';
  }, [poster, type, id]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUseFallback(window.innerWidth < 768);
      const mql = window.matchMedia('(max-width: 767px)');
      const handler = () => setUseFallback(mql.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
  }, []);

  const showVideo = Boolean(src && !reducedMotion && !useFallback);
  const showEmbed = showVideo && (type === 'youtube' || type === 'vimeo') && embedUrl;
  const showNativeVideo = showVideo && type === 'direct';

  // Line-by-line cycle: fade in 1.2s → hold 2.5s → fade out 1s
  useEffect(() => {
    if (reducedMotion) return;
    const cycleDuration = 4700;
    const t = setInterval(() => {
      setLineIndex((i) => (i + 1) % POETRY_LINES.length);
    }, cycleDuration);
    return () => clearInterval(t);
  }, [reducedMotion]);

  const lines = reducedMotion ? [POETRY_LINES[0]] : POETRY_LINES;
  const currentLine = lines[lineIndex % lines.length];

  const videoBgStyle = { filter: 'saturate(0.4) contrast(1.05) brightness(0.9)' };

  return (
    <section
      className="relative w-full min-h-screen flex flex-col justify-center items-center overflow-hidden"
      aria-label="Hero"
    >
      {/* YouTube / Vimeo embed */}
      {showEmbed && (
        <iframe
          src={embedUrl}
          title="Hero video"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            // Scale to cover and center; iframe doesn't support object-fit
            width: '100vw',
            height: '56.25vw',
            minHeight: '100vh',
            minWidth: '177.78vh',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            ...videoBgStyle,
          }}
          allow="autoplay; encrypted-media"
          allowFullScreen
          aria-hidden
        />
      )}

      {/* Direct video (mp4, webm) */}
      {showNativeVideo && (
        <video
          src={src}
          poster={effectivePoster}
          muted
          loop
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover scale-105"
          style={videoBgStyle}
          aria-hidden
        />
      )}

      {/* Fallback: poster image (mobile, reduced-motion, or when embed not available) */}
      {(useFallback || reducedMotion) && src && effectivePoster && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat scale-105"
          style={{
            backgroundImage: `url(${effectivePoster})`,
            ...videoBgStyle,
          }}
          aria-hidden
        />
      )}

      {/* No video or no poster fallback */}
      {(!src || ((useFallback || reducedMotion) && !effectivePoster)) && (
        <div className="absolute inset-0 w-full h-full bg-charcoal" aria-hidden />
      )}

      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-transparent to-charcoal/30 pointer-events-none"
        aria-hidden
      />

      {/* Urdu poetry — line-by-line animation */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center min-h-[8rem] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentLine}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              duration: 1.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="urdu-text text-urdu-hero text-off-white leading-[1.8]"
          >
            {currentLine}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
        aria-hidden
      >
        <motion.span
          className="block w-px h-14 bg-off-white/70"
          animate={{ scaleY: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </section>
  );
}
