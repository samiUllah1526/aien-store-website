import {
  canTransitionOrderStatus,
  ORDER_STATUS,
} from './order-status.enum';
import { OrderStatus } from '@prisma/client';

describe('order-status.enum', () => {
  it('defines all statuses', () => {
    expect(Object.keys(ORDER_STATUS).sort()).toEqual([
      'CANCELLED', 'CONFIRMED', 'DELIVERED', 'PENDING', 'PROCESSING', 'SHIPPED',
    ]);
  });

  describe('canTransitionOrderStatus', () => {
    it('allows valid transitions', () => {
      expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(true);
      expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
      expect(canTransitionOrderStatus(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
      expect(canTransitionOrderStatus(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)).toBe(true);
      expect(canTransitionOrderStatus(OrderStatus.PROCESSING, OrderStatus.SHIPPED)).toBe(true);
    });

    it('allows same status (no-op)', () => {
      expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.PENDING)).toBe(true);
    });

    it('disallows transitions from terminal states', () => {
      expect(canTransitionOrderStatus(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
      expect(canTransitionOrderStatus(OrderStatus.DELIVERED, OrderStatus.SHIPPED)).toBe(false);
      expect(canTransitionOrderStatus(OrderStatus.CANCELLED, OrderStatus.SHIPPED)).toBe(false);
      expect(canTransitionOrderStatus(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
    });
  });
});
