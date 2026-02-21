/** Context for voucher audit logging (actor, request correlation). */
export interface VoucherAuditContext {
  actorId?: string | null;
  requestId?: string | null;
}
