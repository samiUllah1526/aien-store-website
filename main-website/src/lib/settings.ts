/**
 * Build-time public settings fetch. Used by BaseLayout and pages.
 * Falls back to config when API is unavailable.
 */

import {
  storeApiBaseUrl,
  brandName,
  defaultMetaDescription,
  siteUrl,
} from '../config';

export interface PublicFooter {
  tagline?: string;
  copyright?: string;
  email?: string;
  phone?: string;
  hours?: string;
}

export interface PublicSocial {
  facebook?: string;
  facebookVisible?: boolean;
  instagram?: string;
  instagramVisible?: boolean;
  twitter?: string;
  twitterVisible?: boolean;
  youtube?: string;
  youtubeVisible?: boolean;
}

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

export interface PublicAnnouncementItem {
  text: string;
}

export interface PublicAnnouncement {
  items: PublicAnnouncementItem[];
}

export interface PublicHeroSlide {
  src: string;
  alt?: string;
}

export interface PublicHero {
  slides: PublicHeroSlide[];
}

export interface PublicAbout {
  title?: string;
  subtitle?: string;
  content?: string;
  /** Full-bleed banner on /about */
  bannerImageUrl?: string;
}

export interface PublicSettings {
  logoPath: string | null;
  about: PublicAbout;
  footer: PublicFooter;
  social: PublicSocial;
  announcement: PublicAnnouncement;
  hero: PublicHero;
  seo: PublicSeo;
  marketing: PublicMarketing;
}

let cached: PublicSettings | null = null;

const isDev = typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

export async function getPublicSettings(): Promise<PublicSettings> {
  if (cached && !isDev) return cached;
  try {
    const res = await fetch(`${storeApiBaseUrl}/settings/public`);
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (res.ok && json.success && json.data && typeof json.data === 'object') {
      const data = json.data as Record<string, unknown>;
      const seo = (data.seo as Record<string, unknown>) ?? {};
      const marketing = (data.marketing as Record<string, unknown>) ?? {};
      const footer = (data.footer as Record<string, unknown>) ?? {};
      const social = (data.social as Record<string, unknown>) ?? {};
      const logoPath = (data.logoPath as string)?.trim() || null;
      // Support both lowercase and capitalized keys (e.g. youtube vs YouTube from API)
      const youtubeUrl = (social.youtube as string) ?? (social.YouTube as string);
      const youtubeVisibleVal = social.youtubeVisible ?? social.YouTubeVisible;
      const rawAbout = (data.about as Record<string, unknown>) ?? {};
      const rawAnnouncement = (data.announcement as { items?: { text: string }[] }) ?? {};
      const announcementItems = Array.isArray(rawAnnouncement.items)
        ? rawAnnouncement.items.map((item) => ({ text: (item?.text ?? '').trim() })).filter((item) => item.text !== '')
        : [];
      const next: PublicSettings = {
        logoPath,
        about: {
          title: typeof rawAbout.title === 'string' ? rawAbout.title.trim() : undefined,
          subtitle: typeof rawAbout.subtitle === 'string' ? rawAbout.subtitle.trim() : undefined,
          content: typeof rawAbout.content === 'string' ? rawAbout.content : undefined,
          bannerImageUrl:
            typeof rawAbout.bannerImageUrl === 'string' && rawAbout.bannerImageUrl.trim() !== ''
              ? rawAbout.bannerImageUrl.trim()
              : undefined,
        },
        footer: {
          tagline: (footer.tagline as string)?.trim() || '',
          copyright: (footer.copyright as string)?.trim() || '',
          email: (footer.email as string)?.trim() || '',
          phone: (footer.phone as string)?.trim() || '',
          hours: (footer.hours as string)?.trim() || '',
        },
        social: {
          facebook: (social.facebook as string)?.trim() || '',
          facebookVisible: social.facebookVisible === true,
          instagram: (social.instagram as string)?.trim() || '',
          instagramVisible: social.instagramVisible === true,
          twitter: (social.twitter as string)?.trim() || '',
          twitterVisible: social.twitterVisible === true,
          youtube: (youtubeUrl as string)?.trim() || '',
          youtubeVisible: youtubeVisibleVal === true,
        },
        announcement: { items: announcementItems },
        hero: {
          slides: (() => {
            const raw = (data.hero as { slides?: { src?: string; alt?: string }[] }) ?? {};
            return Array.isArray(raw.slides)
              ? raw.slides
                  .filter((s) => s && typeof s.src === 'string' && String(s.src).trim() !== '')
                  .map((s) => ({ src: String(s.src).trim(), alt: typeof s.alt === 'string' ? String(s.alt).trim() || undefined : undefined }))
              : [];
          })(),
        },
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
      cached = next;
      return next;
    }
  } catch {
    // fall through to defaults
  }
  return {
    logoPath: null,
    about: {},
    footer: {
      tagline: '',
      copyright: '',
      email: '',
      phone: '',
      hours: '',
    },
    social: {},
    announcement: { items: [] },
    hero: { slides: [] },
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
}
