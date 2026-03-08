import { z } from 'zod';
import { slugSchema } from './common';

export const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  color: z.string().trim().min(1, 'Color is required'),
  size: z.string().trim().min(1, 'Size is required'),
  sku: z.string().trim().optional().or(z.literal('')),
  stockQuantity: z.coerce.number().int().min(0, 'Stock must be zero or greater'),
  priceOverridePkr: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const productFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Title is required'),
    slug: slugSchema,
    description: z.string().optional(),
    pricePkr: z.string().trim().min(1, 'Price is required'),
    categoryIds: z.array(z.string().uuid()).default([]),
    featured: z.boolean().default(false),
    variants: z.array(productVariantSchema).min(1, 'At least one variant is required'),
    mediaIds: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    const price = Number.parseFloat(value.pricePkr);
    if (Number.isNaN(price) || price < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pricePkr'], message: 'Price must be a non-negative number (PKR).' });
    }
    value.variants.forEach((variant, index) => {
      if (variant.priceOverridePkr) {
        const override = Number.parseFloat(variant.priceOverridePkr);
        if (Number.isNaN(override) || override < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['variants', index, 'priceOverridePkr'],
            message: 'Price override must be a non-negative number',
          });
        }
      }
    });
    const keySet = new Set<string>();
    value.variants.forEach((variant, index) => {
      const key = `${variant.color.trim().toLowerCase()}::${variant.size.trim().toLowerCase()}`;
      if (keySet.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['variants', index, 'size'],
          message: 'Duplicate color/size variant',
        });
      }
      keySet.add(key);
    });
  });

export type ProductFormValues = z.input<typeof productFormSchema>;
export type ProductVariantInput = z.input<typeof productVariantSchema>;
