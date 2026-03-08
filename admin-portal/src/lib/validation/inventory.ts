import { z } from 'zod';

export const adjustStockSchema = z
  .object({
    variantId: z.string().uuid().optional().or(z.literal('')),
    quantityDelta: z.coerce.number().int().refine((value) => value !== 0, 'Change amount cannot be zero'),
    reference: z.string().trim().min(1, 'Reason is required').max(500, 'Reason must be 500 characters or fewer'),
    currentStock: z.number().int().default(0),
  })
  .superRefine((value, ctx) => {
    if (value.currentStock + value.quantityDelta < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantityDelta'],
        message: 'Change would make stock negative',
      });
    }
  });
