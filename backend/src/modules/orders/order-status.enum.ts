import { OrderStatus as PrismaOrderStatus } from '@prisma/client';

/**
 * Order delivery status flow: pending → shipped → delivered | cancelled
 * Schema also supports CONFIRMED and PROCESSING as intermediate states.
 */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusType = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** Allowed status transitions (from -> to). */
const ALLOWED_TRANSITIONS: Record<PrismaOrderStatus, PrismaOrderStatus[]> = {
  PENDING: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // terminal
  CANCELLED: [], // terminal
};

export function canTransitionOrderStatus(
  from: PrismaOrderStatus,
  to: PrismaOrderStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export { PrismaOrderStatus as OrderStatus };
