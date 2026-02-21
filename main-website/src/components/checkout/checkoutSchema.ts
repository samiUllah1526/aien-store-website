import { z } from 'zod';

const PAYMENT_PROOF_MAX_MB = 5;

export const checkoutSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().max(100).optional(),
    phone: z.string().min(1, 'Phone is required').max(50),
    shippingCountry: z.string().min(1).default('PK'),
    shippingAddressLine1: z.string().min(1, 'Address is required').max(200),
    shippingAddressLine2: z.string().max(200).optional(),
    shippingCity: z.string().min(1, 'City is required').max(100),
    shippingPostalCode: z.string().max(20).optional(),
    paymentMethod: z.enum(['cod', 'bank']),
    paymentProof: z.any().optional(), // FileList from input; validated in superRefine
    saveInfo: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'bank') {
      const list = data.paymentProof as FileList | undefined;
      if (!list?.length || !list[0]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentProof'],
          message: 'Please upload a screenshot of your payment as proof',
        });
        return;
      }
      const file = list[0];
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentProof'],
          message: 'Use a JPEG, PNG, WebP or GIF image',
        });
        return;
      }
      if (file.size > PAYMENT_PROOF_MAX_MB * 1024 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentProof'],
          message: `File must be under ${PAYMENT_PROOF_MAX_MB}MB`,
        });
      }
    }
  });

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const checkoutDefaultValues: CheckoutFormData = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  shippingCountry: 'PK',
  shippingAddressLine1: '',
  shippingAddressLine2: '',
  shippingCity: '',
  shippingPostalCode: '',
  paymentMethod: 'cod',
  saveInfo: false,
};
