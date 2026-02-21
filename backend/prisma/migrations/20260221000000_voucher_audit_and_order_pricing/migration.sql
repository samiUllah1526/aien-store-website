-- Order: add full pricing breakdown (subtotal, shipping, discount type)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal_cents" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_cents" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_type" TEXT;

-- Backfill existing orders: derive subtotal from order_items, shipping from total - subtotal - discount
UPDATE "orders" o
SET
  "subtotal_cents" = COALESCE((
    SELECT SUM(oi."unit_cents" * oi."quantity")
    FROM "order_items" oi
    WHERE oi."order_id" = o."id"
  ), o."total_cents"),
  "shipping_cents" = 0,
  "discount_type" = NULL
WHERE o."subtotal_cents" IS NULL;

-- VoucherAuditLog table
CREATE TABLE IF NOT EXISTS "voucher_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_id" UUID,
    "action" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" UUID,
    "order_id" UUID,
    "code" TEXT,
    "result" TEXT,
    "error_code" TEXT,
    "metadata" JSONB,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "voucher_audit_logs_voucher_id_idx" ON "voucher_audit_logs"("voucher_id");
CREATE INDEX IF NOT EXISTS "voucher_audit_logs_order_id_idx" ON "voucher_audit_logs"("order_id");
CREATE INDEX IF NOT EXISTS "voucher_audit_logs_action_idx" ON "voucher_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "voucher_audit_logs_created_at_idx" ON "voucher_audit_logs"("created_at");
CREATE INDEX IF NOT EXISTS "voucher_audit_logs_code_idx" ON "voucher_audit_logs"("code");

ALTER TABLE "voucher_audit_logs" ADD CONSTRAINT "voucher_audit_logs_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
