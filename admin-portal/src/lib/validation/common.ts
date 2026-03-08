import { z } from 'zod';

export const trimmedString = (min = 1, message = 'Required') =>
  z.string().trim().min(min, message);

export const optionalTrimmedString = () =>
  z
    .string()
    .transform((value) => value.trim())
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : undefined));

export const nullableTrimmedString = () =>
  z
    .string()
    .transform((value) => value.trim())
    .optional()
    .or(z.literal(''))
    .nullable()
    .transform((value) => (value ? value : null));

export const nonNegativeIntFromString = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), `${label} must be a whole number`)
    .transform((value) => (value === '' ? undefined : Number.parseInt(value, 10)));

export const nonNegativeNumberFromString = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || !Number.isNaN(Number.parseFloat(value)), `${label} must be a valid number`)
    .transform((value) => (value === '' ? undefined : Number.parseFloat(value)));

export const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only');
