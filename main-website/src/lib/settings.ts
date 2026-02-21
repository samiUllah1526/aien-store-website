/**
 * Build-time public settings fetch. Used by BaseLayout and pages.
 * Falls back to config when API is unavailable.
 */

import {
  apiBaseUrl,
  brandName,
  defaultMetaDescription,
  faviconPath,
  siteUrl,
} from '../config';

export interface PublicSeo {
  siteTitle: string;
  defaultDescription: string;
  siteUrl: string;
  ogImageDefault: string;
  twitterHandle: string;
  googleSiteVerification: string;
}

export interface PublicMarketing {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  enabled: boolean;
}

export interface PublicSettings {
  seo: PublicSeo;
  marketing: PublicMarketing;
}

let cached: PublicSettings | null = null;

export async function getPublicSettings(): Promise<PublicSettings> {
  if (cached) return cached;
  try {
    const res = await fetch(`${apiBaseUrl}/settings/public`);
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (res.ok && json.success && json.data && typeof json.data === 'object') {
      const data = json.data as Record<string, unknown>;
      const seo = (data.seo as Record<string, unknown>) ?? {};
      const marketing = (data.marketing as Record<string, unknown>) ?? {};
      cached = {
        seo: {
          siteTitle: (seo.siteTitle as string)?.trim() || brandName,
          defaultDescription: (seo.defaultDescription as string)?.trim() || defaultMetaDescription,
          siteUrl: ((seo.siteUrl as string)?.trim() || siteUrl).replace(/\/+$/, ''),
          ogImageDefault: (seo.ogImageDefault as string)?.trim() || '',
          twitterHandle: ((seo.twitterHandle as string)?.trim() || '').replace(/^@/, ''),
          googleSiteVerification: (seo.googleSiteVerification as string)?.trim() || '',
        },
        marketing: {
          metaPixelId: (marketing.metaPixelId as string)?.trim() || undefined,
          googleAnalyticsId: (marketing.googleAnalyticsId as string)?.trim() || undefined,
          googleTagManagerId: (marketing.googleTagManagerId as string)?.trim() || undefined,
          enabled: marketing.enabled !== false,
        },
      };
      return cached;
    }
  } catch {
    // fall through to defaults
  }
  cached = {
    seo: {
      siteTitle: brandName,
      defaultDescription: defaultMetaDescription,
      siteUrl,
      ogImageDefault: '',
      twitterHandle: '',
      googleSiteVerification: '',
    },
    marketing: {
      enabled: true,
    },
  };
  return cached;
}
