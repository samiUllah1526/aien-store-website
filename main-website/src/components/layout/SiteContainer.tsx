/**
 * SiteContainer: max-width 1440px, centered, with AIEN editorial gutters.
 * Desktop padding maps to the design-system "margin-page" token (64px).
 */

import type { ReactNode } from 'react';

const SITE_CONTAINER_CLASS = 'max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 w-full';

interface SiteContainerProps {
  children: ReactNode;
  className?: string;
  /** Render as `<section>` instead of `<div>` (semantic helper). */
  as?: 'div' | 'section';
}

export default function SiteContainer({ children, className = '', as = 'div' }: SiteContainerProps) {
  const Tag = as;
  return <Tag className={`${SITE_CONTAINER_CLASS} ${className}`.trim()}>{children}</Tag>;
}

export { SITE_CONTAINER_CLASS };
