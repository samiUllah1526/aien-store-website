import type { OrderStatus } from './types';

/** Valid next statuses from each current status (includes current = "no change"). Terminal statuses have only themselves. */
const VALID_NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED'],
  CONFIRMED: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'CANCELLED'],
  PROCESSING: ['PROCESSING', 'SHIPPED', 'CANCELLED'],
  SHIPPED: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED'],
};

const TERMINAL: OrderStatus[] = ['DELIVERED', 'CANCELLED'];

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.includes(status as OrderStatus);
}

/** Returns statuses that can be selected from the dropdown for the given current status. */
export function getAllowedNextStatuses(currentStatus: string): OrderStatus[] {
  return VALID_NEXT[currentStatus as OrderStatus] ?? [currentStatus as OrderStatus];
}
