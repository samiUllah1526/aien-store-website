import { z } from 'zod';
import { trimmedString } from './common';

export const inviteUserSchema = z.object({
  name: trimmedString(1, 'Name is required'),
  email: z.string().trim().email('Valid email is required'),
  roleIds: z.array(z.string().uuid()).default([]),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const editUserPermissionsSchema = z.object({
  roleIds: z.array(z.string().uuid()).default([]),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const userFormSchema = z
  .object({
    firstName: z.string().trim().optional().or(z.literal('')),
    lastName: z.string().trim().optional().or(z.literal('')),
    name: z.string().trim().optional().or(z.literal('')),
    email: z.string().trim().email('Valid email is required'),
    password: z.string().optional().or(z.literal('')),
    status: z.enum(['ACTIVE', 'DISABLED']),
    roleIds: z.array(z.string().uuid()).default([]),
    isEdit: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const passwordLength = value.password?.length ?? 0;
    if (!value.isEdit && passwordLength < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password must be at least 8 characters' });
    }
    if (value.isEdit && passwordLength > 0 && passwordLength < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password must be at least 8 characters if provided' });
    }
  });
