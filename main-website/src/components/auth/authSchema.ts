import { z } from 'zod';

/**
 * Shared password rule for register + reset flows. NIST SP 800-63B-aligned:
 * length is the primary strength factor; we additionally require at least one
 * letter and one digit so common keyboard sequences ("12345678") and dictionary
 * words ("password") are rejected. Symbols are intentionally not required —
 * they cause user friction without meaningfully reducing crackability vs. a
 * longer passphrase.
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const loginDefaultValues: LoginFormData = {
  email: '',
  password: '',
};

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().max(100).optional(),
    email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const registerDefaultValues: RegisterFormData = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
