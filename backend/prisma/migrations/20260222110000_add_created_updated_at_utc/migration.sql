-- Ensure all tables have created_at and updated_at in UTC (TIMESTAMPTZ).
-- Add missing columns; existing DateTime columns already use TIMESTAMPTZ.

-- UserSavedShipping: add created_at
ALTER TABLE "user_saved_shipping" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Ensure created_at comes before updated_at in table order (cosmetic; column order doesn't affect behavior)
-- PostgreSQL doesn't support reordering; both columns exist and work.

-- SiteSetting: add created_at
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- UserRole: add updated_at
ALTER TABLE "user_roles" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- RolePermission: add updated_at
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- UserFavorite: add updated_at
ALTER TABLE "user_favorites" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ProductCategory: add updated_at
ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ProductMedia: add updated_at
ALTER TABLE "product_media" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- VoucherRedemption: add updated_at
ALTER TABLE "voucher_redemptions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- VoucherAuditLog: add updated_at
ALTER TABLE "voucher_audit_logs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- InventoryMovement: add updated_at
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- IdempotencyKey: add updated_at
ALTER TABLE "idempotency_keys" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- OrderStatusHistory: add updated_at
ALTER TABLE "order_status_history" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- EmailLog: add updated_at
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
