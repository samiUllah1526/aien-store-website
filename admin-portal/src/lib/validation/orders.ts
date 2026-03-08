import { z } from 'zod';

export const orderStatusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export const orderCourierSchema = z.object({
  courierServiceName: z.string().trim().max(120).optional().or(z.literal('')),
  trackingId: z.string().trim().max(120).optional().or(z.literal('')),
});
