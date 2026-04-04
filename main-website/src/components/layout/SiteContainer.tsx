/**
 * Site container: max-width 1440px, centered, with horizontal padding (40px at lg+).
 * Use for sections that should align with header/footer; omit for full-bleed (hero, category banners).
 */

import type { ReactNode } from 'react';

const SITE_CONTAINER_CLASS = 'max-w-site mx-auto px-4 sm:px-6 lg:px-10 w-full';

interface SiteContainerProps {
  children: ReactNode;
  className?: string;
}

export default function SiteContainer({ children, className = '' }: SiteContainerProps) {
  return <div className={`${SITE_CONTAINER_CLASS} ${className}`.trim()}>{children}</div>;
}

export { SITE_CONTAINER_CLASS };
