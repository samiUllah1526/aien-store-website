import {
  canTransitionOrderStatus,
  ORDER_STATUS,
} from './order-status.enum';
import { OrderStatus } from '@prisma/client';

describe('order-status.enum', () => {
  describe('ORDER_STATUS', () => {
    it('should define all expected statuses', () => {
      expect(ORDER_STATUS.PENDING).toBe('PENDING');
      expect(ORDER_STATUS.SHIPPED).toBe('SHIPPED');
      expect(ORDER_STATUS.DELIVERED).toBe('DELIVERED');
      expect(ORDER_STATUS.CANCELLED).toBe('CANCELLED');
      expect(ORDER_STATUS.CONFIRMED).toBe('CONFIRMED');
      expect(ORDER_STATUS.PROCESSING).toBe('PROCESSING');
    });
  });

  describe('canTransitionOrderStatus', () => {
    it('should allow PENDING -> SHIPPED', () => {
      expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(true);
    });

    it('should allow PENDING -> CANCELLED', () => {
      expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
    });

    it('should allow SHIPPED -> DELIVERED', () => {
      expect(canTransitionOrderStatus(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
    });

    it('should allow same status (no-op)', () => {
      expect(canTransitionOrderStatus(OrderStatus.PENDING, OrderStatus.PENDING)).toBe(true);
    });

    it('should disallow DELIVERED -> PENDING', () => {
      expect(canTransitionOrderStatus(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
    });

    it('should disallow DELIVERED -> SHIPPED', () => {
      expect(canTransitionOrderStatus(OrderStatus.DELIVERED, OrderStatus.SHIPPED)).toBe(false);
    });

    it('should disallow CANCELLED -> any', () => {
      expect(canTransitionOrderStatus(OrderStatus.CANCELLED, OrderStatus.SHIPPED)).toBe(false);
      expect(canTransitionOrderStatus(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
    });

    it('should allow CONFIRMED -> PROCESSING', () => {
      expect(canTransitionOrderStatus(OrderStatus.CONFIRMED, OrderStatus.PROCESSING)).toBe(true);
    });

    it('should allow PROCESSING -> SHIPPED', () => {
      expect(canTransitionOrderStatus(OrderStatus.PROCESSING, OrderStatus.SHIPPED)).toBe(true);
    });
  });
});
