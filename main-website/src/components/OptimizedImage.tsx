/**
 * Responsive image with provider-aware optimization, plus three layers of
 * resilience that protect the layout from large / broken / slow uploads:
 *
 *   1. Skeleton placeholder (animated `bg-surface-container-low`) shown until
 *      the image decodes — eliminates the empty-then-snap-in flash on slow
 *      networks.
 *   2. Cached-image detection — if the image is already in the browser cache,
 *      `onLoad` fires before React attaches its handler, so we check
 *      `imgRef.current.complete` after mount and skip the skeleton.
 *   3. `onError` fallback — when the URL 404s or times out, we render a
 *      generic placeholder instead of the browser's broken-image icon. Pass a
 *      custom `fallback` node to override.
 *
 * Layout invariants:
 *   - The component renders a single `<span class="block w-full h-full">`
 *     wrapper, so it fills whatever fixed-ratio / fixed-size parent contains
 *     it (e.g. `aspect-[3/4]`, `h-64 w-48`). The wrapper is `position:
 *     relative` so the skeleton/fallback overlays stack correctly.
 *   - `className` continues to flow to the inner `<img>` (transforms,
 *     hover-scale, object-fit, etc.). Pass `wrapperClassName` for any layout
 *     class that needs to live on the wrapper instead.
 *   - Cloudinary URLs get auto srcset (320/640/960/1280px) when `responsive`
 *     is set — required to stop a 4000px upload from being served verbatim
 *     to a phone.
 *
 * NOT a security boundary: never render image responses as HTML.
 */

import React, { useEffect, useRef, useState } from 'react';
import { optimizedImageUrl, isOptimizableUrl, type ImageTransformOptions } from '../lib/image-optimize';

interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  /** Transform options. Applied when URL is from a supported provider (e.g. Cloudinary). */
  transform?: ImageTransformOptions;
  /** Use srcset with multiple widths (only when URL is optimizable). */
  responsive?: boolean;
  /** Extra classes for the wrapper element. */
  wrapperClassName?: string;
  /** Custom node rendered when the image fails to load. */
  fallback?: React.ReactNode;
}

const RESPONSIVE_WIDTHS = [320, 640, 960, 1280];

const DEFAULT_FALLBACK = (
  <span
    className="absolute inset-0 flex items-center justify-center bg-surface-container-low text-on-surface-variant"
    aria-hidden
  >
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.7" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  </span>
);

export default function OptimizedImage({
  src,
  transform,
  responsive,
  wrapperClassName,
  fallback,
  className,
  onLoad,
  onError,
  ...imgProps
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    const node = imgRef.current;
    if (node?.complete) {
      if (node.naturalWidth > 0) {
        setLoaded(true);
      } else {
        setErrored(true);
      }
    }
  }, [src]);

  const showResponsive = Boolean(responsive && src && isOptimizableUrl(src));
  const optimizedSrc = optimizedImageUrl(src, transform);
  const srcSet = showResponsive
    ? RESPONSIVE_WIDTHS.map(
        (w) => `${optimizedImageUrl(src, { ...transform, width: w })} ${w}w`,
      ).join(', ')
    : undefined;
  const sizes = showResponsive
    ? imgProps.sizes ?? '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw'
    : imgProps.sizes;

  return (
    <span
      className={`relative block w-full h-full overflow-hidden ${wrapperClassName ?? ''}`}
    >
      {!loaded && !errored && (
        <span
          className="absolute inset-0 bg-surface-container-low animate-pulse"
          aria-hidden
        />
      )}
      {errored && (fallback ?? DEFAULT_FALLBACK)}
      {!errored && (
        <img
          ref={imgRef}
          {...imgProps}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          loading={imgProps.loading ?? 'lazy'}
          decoding="async"
          className={`${className ?? ''} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setErrored(true);
            onError?.(e);
          }}
        />
      )}
    </span>
  );
}
