/**
 * Responsive image with provider-aware optimization.
 * Cloudinary URLs get transforms; others pass through. Extensible for S3/imgix.
 */

import React from 'react';
import { optimizedImageUrl, isOptimizableUrl, type ImageTransformOptions } from '../lib/image-optimize';

interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  /** Transform options. Applied when URL is from a supported provider (e.g. Cloudinary). */
  transform?: ImageTransformOptions;
  /** Use srcset with multiple widths (only when URL is optimizable). */
  responsive?: boolean;
}

const RESPONSIVE_WIDTHS = [320, 640, 960, 1280];

export default function OptimizedImage({
  src,
  transform,
  responsive,
  ...imgProps
}: OptimizedImageProps) {
  const optimizedSrc = optimizedImageUrl(src, transform);

  if (responsive && src && isOptimizableUrl(src)) {
    const srcSet = RESPONSIVE_WIDTHS.map(
      (w) =>
        `${optimizedImageUrl(src, { ...transform, width: w })} ${w}w`,
    ).join(', ');
    const sizes =
      imgProps.sizes ?? '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';
    return (
      <img
        {...imgProps}
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={sizes}
        loading={imgProps.loading ?? 'lazy'}
        decoding="async"
      />
    );
  }

  return (
    <img
      {...imgProps}
      src={optimizedSrc}
      loading={imgProps.loading ?? 'lazy'}
      decoding="async"
    />
  );
}
