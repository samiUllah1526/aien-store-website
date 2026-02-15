import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const loginDefaultValues: LoginFormData = {
  email: '',
  password: '',
};

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().min(1, 'Email is required').email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
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
