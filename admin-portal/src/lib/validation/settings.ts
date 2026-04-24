import { z } from 'zod';

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional().or(z.literal('')),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const permissionCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+:[a-z0-9]+$/, 'Name must use format resource:action'),
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
});

export const permissionEditSchema = z.object({
  description: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
});

export const deliverySettingsSchema = z
  .object({
    freeDelivery: z.boolean(),
    deliveryChargesPkr: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    if (!value.freeDelivery) {
      const parsed = Number.parseFloat(value.deliveryChargesPkr || '');
      if (Number.isNaN(parsed) || parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['deliveryChargesPkr'],
          message: 'Enter a valid delivery charge (PKR).',
        });
      }
    }
  });

export const aboutSettingsSchema = z.object({
  title: z.string().optional().or(z.literal('')),
  subtitle: z.string().optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
  bannerImageUrl: z.string().optional().or(z.literal('')),
});

export const footerSettingsSchema = z.object({
  tagline: z.string().optional().or(z.literal('')),
  copyright: z.string().optional().or(z.literal('')),
  email: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  hours: z.string().optional().or(z.literal('')),
});

export const socialSettingsSchema = z.object({
  facebook: z.string().optional().or(z.literal('')),
  facebookVisible: z.boolean().default(true),
  instagram: z.string().optional().or(z.literal('')),
  instagramVisible: z.boolean().default(true),
  twitter: z.string().optional().or(z.literal('')),
  twitterVisible: z.boolean().default(true),
  youtube: z.string().optional().or(z.literal('')),
  youtubeVisible: z.boolean().default(true),
});

export const bankingSettingsSchema = z.object({
  bankName: z.string().optional().or(z.literal('')),
  accountTitle: z.string().optional().or(z.literal('')),
  accountNumber: z.string().optional().or(z.literal('')),
  iban: z.string().optional().or(z.literal('')),
  instructions: z.string().optional().or(z.literal('')),
});

export const seoSettingsSchema = z.object({
  siteTitle: z.string().optional().or(z.literal('')),
  defaultDescription: z.string().optional().or(z.literal('')),
  siteUrl: z.string().optional().or(z.literal('')),
  ogImageDefault: z.string().optional().or(z.literal('')),
  twitterHandle: z.string().optional().or(z.literal('')),
  googleSiteVerification: z.string().optional().or(z.literal('')),
});

/** Homepage schema.org JSON-LD (store, address, phone). */
export const businessSettingsSchema = z.object({
  schemaOrgType: z.string().trim().max(80).optional().or(z.literal('')),
  telephone: z.string().trim().max(80).optional().or(z.literal('')),
  contactType: z.string().trim().max(80).optional().or(z.literal('')),
  addressCountry: z.string().trim().max(10).optional().or(z.literal('')),
  addressLocality: z.string().trim().max(120).optional().or(z.literal('')),
  addressRegion: z.string().trim().max(120).optional().or(z.literal('')),
});

export const marketingSettingsSchema = z.object({
  metaPixelId: z.string().optional().or(z.literal('')),
  googleAnalyticsId: z.string().optional().or(z.literal('')),
  googleTagManagerId: z.string().optional().or(z.literal('')),
  enabled: z.boolean().default(true),
});

export const announcementSettingsSchema = z.object({
  items: z.array(z.object({ text: z.string(), visible: z.boolean().default(true) })).default([]),
});

export const heroSettingsSchema = z.object({
  slides: z.array(z.object({ src: z.string(), alt: z.string().optional().or(z.literal('')) })).default([]),
});
