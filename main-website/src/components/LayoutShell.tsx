/**
 * App shell: announcement bar, header (logo, search, theme, cart, profile menu), main slot, footer, CartSidebar, Toast.
 */

import type { ReactNode } from 'react';
import { brandName } from '../config';
import { getApiBaseUrl } from '../lib/api';
import CartSidebar from './cart/CartSidebar';
import AnnouncementBar from './layout/AnnouncementBar';
import AppFooter from './layout/AppFooter';
import AppHeader from './layout/AppHeader';
import SiteContainer from './layout/SiteContainer';
import SmoothScroll from './SmoothScroll';
import Toast from './Toast';

export interface SiteSettings {
  logoPath: string | null;
  about?: { title?: string; subtitle?: string; content?: string };
  footer?: {
    tagline?: string;
    copyright?: string;
    email?: string;
    phone?: string;
    hours?: string;
  };
  social?: {
    facebook?: string;
    facebookVisible?: boolean;
    instagram?: string;
    instagramVisible?: boolean;
    twitter?: string;
    twitterVisible?: boolean;
    youtube?: string;
    youtubeVisible?: boolean;
  };
}

function logoUrl(logoPath: string | null): string {
  if (!logoPath) return '';
  const base = getApiBaseUrl().replace(/\/$/, '');
  return logoPath.startsWith('http') ? logoPath : `${base}/media/file/${logoPath}`;
}

function ShellContent({
  children,
  siteSettings,
}: {
  children: ReactNode;
  siteSettings: SiteSettings | null | undefined;
}) {
  const copyrightText = siteSettings?.footer?.copyright ?? '';
  const logoSrc = siteSettings?.logoPath ? logoUrl(siteSettings.logoPath) : '';
  const social = siteSettings?.social ?? {};
  const email = siteSettings?.footer?.email ?? '';
  const phone = siteSettings?.footer?.phone ?? '';
  const hours = siteSettings?.footer?.hours ?? '';

  return (
    <>
      <AnnouncementBar />
      <SiteContainer className="w-full">
        <AppHeader logoSrc={logoSrc} />
      </SiteContainer>
      <main className="flex-1 w-full min-w-0 overflow-x-clip">{children}</main>
      <AppFooter
          copyrightText={copyrightText}
          tagline={siteSettings?.footer?.tagline}
          email={email}
          phone={phone}
          hours={hours}
          social={social}
        />
      <CartSidebar />
      <Toast />
      <SmoothScroll />
    </>
  );
}

export default function LayoutShell({
  children,
  siteSettings,
}: {
  children: ReactNode;
  siteSettings?: SiteSettings | null;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <ShellContent siteSettings={siteSettings}>{children}</ShellContent>
    </div>
  );
}
