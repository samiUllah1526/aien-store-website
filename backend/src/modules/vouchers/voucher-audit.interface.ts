/**
 * Voucher audit event - abstraction for future event-driven scalability (e.g. Kafka).
 * Implementations write to DB; later a Kafka publisher can implement the same interface.
 */
export type VoucherAuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'ACTIVATED'
  | 'DEACTIVATED'
  | 'DELETED'
  | 'VALIDATED'
  | 'VALIDATION_FAILED'
  | 'REDEEMED'
  | 'EXPIRED';

export type VoucherAuditActorType = 'ADMIN' | 'CUSTOMER' | 'SYSTEM';

export interface VoucherAuditEvent {
  voucherId?: string | null;
  action: VoucherAuditAction;
  actorType: VoucherAuditActorType;
  actorId?: string | null;
  orderId?: string | null;
  code?: string | null;
  result?: 'VALID' | 'INVALID' | null;
  errorCode?: string | null;
  metadata?: Record<string, unknown> | null;
  requestId?: string | null;
}

export interface VoucherAuditPublisher {
  publish(event: VoucherAuditEvent): Promise<void>;
}
