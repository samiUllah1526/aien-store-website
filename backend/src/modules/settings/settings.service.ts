import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SettingsKey } from './dto/update-setting.dto';

export interface GeneralValue {
  logoMediaId?: string | null;
  /** Site favicon (PNG, ICO, SVG, etc.); resolved to URL in public settings. */
  faviconMediaId?: string | null;
}

export interface AboutValue {
  title?: string;
  subtitle?: string;
  content?: string;
  /** Full-bleed banner on /about (URL or path; same as hero slides). */
  bannerImageUrl?: string;
}

export interface FooterValue {
  tagline?: string;
  copyright?: string;
  email?: string;
  phone?: string;
  hours?: string;
}

export interface SocialValue {
  facebook?: string;
  facebookVisible?: boolean;
  instagram?: string;
  instagramVisible?: boolean;
  twitter?: string;
  twitterVisible?: boolean;
  youtube?: string;
  youtubeVisible?: boolean;
}

export interface DeliveryValue {
  deliveryChargesCents?: number;
}

export interface BankingValue {
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
  instructions?: string;
}

export interface SeoValue {
  siteTitle?: string;
  defaultDescription?: string;
  siteUrl?: string;
  ogImageDefault?: string;
  twitterHandle?: string;
  googleSiteVerification?: string;
}

/** Homepage JSON-LD (schema.org LocalBusiness-style). Edited in Admin → SEO tab. */
export interface BusinessValue {
  /** schema.org @type, e.g. ClothingStore, Store */
  schemaOrgType?: string;
  telephone?: string;
  contactType?: string;
  addressCountry?: string;
  addressLocality?: string;
  addressRegion?: string;
}

export interface MarketingValue {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  enabled?: boolean;
}

export interface AnnouncementItem {
  text: string;
  /** If false, hidden on website but kept in admin. Default true. */
  visible?: boolean;
}

export interface AnnouncementValue {
  items?: AnnouncementItem[];
}

export interface HeroSlideValue {
  src: string;
  alt?: string;
}

export interface HeroValue {
  slides?: HeroSlideValue[];
}

export interface PublicSettingsDto {
  logoPath: string | null;
  /** Resolved favicon URL when set in general settings; storefront falls back to env/static default when null. */
  faviconPath: string | null;
  about: AboutValue;
  footer: FooterValue;
  social: SocialValue;
  /** Announcement bar items (multiple messages). */
  announcement: AnnouncementValue;
  /** Hero carousel image slides (home page). */
  hero: HeroValue;
  /** Delivery charges in cents. 0 = free delivery. */
  deliveryChargesCents: number;
  /** Bank account details shown at checkout for Bank Deposit. */
  banking: BankingValue;
  /** SEO meta defaults (site title, description, canonical base, etc.) */
  seo: SeoValue;
  /** Store / structured data for homepage JSON-LD */
  business: {
    schemaOrgType: string;
    telephone: string;
    contactType: string;
    addressCountry: string;
    addressLocality: string;
    addressRegion: string;
  };
  /** Marketing pixels and tracking (Meta Pixel, GA, GTM) */
  marketing: MarketingValue;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByKey(key: string): Promise<Record<string, unknown> | null> {
    const row = await this.prisma.siteSetting.findUnique({
      where: { key },
    });
    return row ? (row.value as Record<string, unknown>) : null;
  }

  async getAll(): Promise<Record<string, Record<string, unknown>>> {
    const rows = await this.prisma.siteSetting.findMany();
    const out: Record<string, Record<string, unknown>> = {};
    for (const row of rows) {
      out[row.key] = row.value as Record<string, unknown>;
    }
    return out;
  }

  async set(key: SettingsKey, value: Record<string, unknown>): Promise<void> {
    await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
  }

  /** Resolve media ID to URL for public API. Returns deliveryUrl (Cloudinary) or path for local. */
  private async resolveMediaPath(
    mediaId: string | null | undefined,
  ): Promise<string | null> {
    if (!mediaId) return null;
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: { path: true, deliveryUrl: true },
    });
    if (!media) return null;
    return media.deliveryUrl ?? media.path ?? null;
  }

  async getPublic(): Promise<PublicSettingsDto> {
    const [
      general,
      about,
      footer,
      social,
      delivery,
      banking,
      seo,
      business,
      marketing,
      announcement,
      hero,
    ] = await Promise.all([
      this.getByKey('general'),
      this.getByKey('about'),
      this.getByKey('footer'),
      this.getByKey('social'),
      this.getByKey('delivery'),
      this.getByKey('banking'),
      this.getByKey('seo'),
      this.getByKey('business'),
      this.getByKey('marketing'),
      this.getByKey('announcement'),
      this.getByKey('hero'),
    ]);

    const generalVal = general as GeneralValue | null;
    const logoPath = await this.resolveMediaPath(
      generalVal?.logoMediaId ?? null,
    );
    const faviconPath = await this.resolveMediaPath(
      generalVal?.faviconMediaId ?? null,
    );
    const deliveryVal = delivery as DeliveryValue | null;
    const deliveryChargesCents =
      typeof deliveryVal?.deliveryChargesCents === 'number' &&
      deliveryVal.deliveryChargesCents >= 0
        ? deliveryVal.deliveryChargesCents
        : 0;
    const bankingVal = banking as BankingValue | null;
    const seoVal = seo as SeoValue | null;
    const businessVal = business as BusinessValue | null;
    const marketingVal = marketing as MarketingValue | null;

    return {
      logoPath,
      faviconPath,
      about: (about as AboutValue) ?? {},
      footer: (footer as FooterValue) ?? {},
      social: (social as SocialValue) ?? {},
      announcement: (() => {
        const raw = (announcement as AnnouncementValue) ?? { items: [] };
        const items = (raw.items ?? []).filter(
          (item) => item.visible !== false,
        );
        return { items };
      })(),
      hero: (() => {
        const raw = (hero as HeroValue) ?? { slides: [] };
        const slides = Array.isArray(raw.slides)
          ? raw.slides
              .filter(
                (s) => s && typeof s.src === 'string' && s.src.trim() !== '',
              )
              .map((s) => ({
                src: s.src.trim(),
                alt:
                  typeof s.alt === 'string'
                    ? s.alt.trim() || undefined
                    : undefined,
              }))
          : [];
        return { slides };
      })(),
      deliveryChargesCents,
      banking: bankingVal
        ? {
            bankName: bankingVal.bankName ?? '',
            accountTitle: bankingVal.accountTitle ?? '',
            accountNumber: bankingVal.accountNumber ?? '',
            iban: bankingVal.iban ?? '',
            instructions: bankingVal.instructions ?? '',
          }
        : {},
      seo: seoVal
        ? {
            siteTitle: seoVal.siteTitle?.trim() ?? '',
            defaultDescription: seoVal.defaultDescription?.trim() ?? '',
            siteUrl: (seoVal.siteUrl?.trim() ?? '').replace(/\/+$/, ''),
            ogImageDefault: seoVal.ogImageDefault?.trim() ?? '',
            twitterHandle: (seoVal.twitterHandle?.trim() ?? '').replace(
              /^@/,
              '',
            ),
            googleSiteVerification: seoVal.googleSiteVerification?.trim() ?? '',
          }
        : {},
      business: {
        schemaOrgType: (() => {
          const raw = (businessVal?.schemaOrgType ?? '').trim().slice(0, 80);
          return raw || 'ClothingStore';
        })(),
        telephone: (businessVal?.telephone ?? '').trim().slice(0, 80),
        contactType: (() => {
          const raw = (businessVal?.contactType ?? '').trim().slice(0, 80);
          return raw || 'customer service';
        })(),
        addressCountry: (businessVal?.addressCountry ?? '').trim().slice(0, 10),
        addressLocality: (businessVal?.addressLocality ?? '').trim().slice(0, 120),
        addressRegion: (businessVal?.addressRegion ?? '').trim().slice(0, 120),
      },
      marketing: marketingVal
        ? {
            metaPixelId:
              (marketingVal.metaPixelId?.trim() ?? '')
                .replace(/\D/g, '')
                .slice(0, 20) || undefined,
            googleAnalyticsId: marketingVal.googleAnalyticsId?.trim() ?? '',
            googleTagManagerId: (() => {
              const raw = (
                marketingVal.googleTagManagerId?.trim() ?? ''
              ).toUpperCase();
              if (raw.startsWith('GTM')) return raw;
              const digits = raw.replace(/\D/g, '');
              return digits ? `GTM-${digits}` : undefined;
            })(),
            enabled: marketingVal.enabled !== false,
          }
        : { enabled: true },
    };
  }
}
