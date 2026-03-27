import { z } from 'zod';

export const voucherFormSchema = z
  .object({
    code: z.string().trim().min(1, 'Code is required'),
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
    value: z.string().trim(),
    minOrderValuePkr: z.string().trim().optional().or(z.literal('')),
    maxDiscountPkr: z.string().trim().optional().or(z.literal('')),
    startDate: z.string().trim().min(1, 'Start date is required'),
    expiryDate: z.string().trim().min(1, 'Expiry date is required'),
    usageLimitGlobal: z.string().trim().optional().or(z.literal('')),
    usageLimitPerUser: z.string().trim().optional().or(z.literal('')),
    applicableProductIds: z.array(z.string().uuid()).default([]),
    applicableCategoryIds: z.array(z.string().uuid()).default([]),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    const parsedValue = Number.parseInt(value.value, 10);
    if (value.type !== 'FREE_SHIPPING') {
      if (Number.isNaN(parsedValue) || parsedValue < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Value must be a positive number' });
      }
      if (value.type === 'PERCENTAGE' && (parsedValue < 1 || parsedValue > 100)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Percentage must be between 1 and 100' });
      }
    }
    const start = new Date(value.startDate);
    const expiry = new Date(value.expiryDate);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'Invalid start date' });
    }
    if (Number.isNaN(expiry.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expiryDate'], message: 'Invalid expiry date' });
    }
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(expiry.getTime()) && expiry <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expiryDate'], message: 'Expiry date must be after start date' });
    }
  });
