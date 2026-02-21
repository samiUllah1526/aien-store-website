-- AlterTable: add stock_quantity to products (inventory)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum: inventory movement type
DO $$ BEGIN
  CREATE TYPE "inventory_movement_type" AS ENUM ('sale', 'restore', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: inventory_movements (audit trail for stock changes)
CREATE TABLE IF NOT EXISTS "inventory_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "order_id" UUID,
    "type" "inventory_movement_type" NOT NULL,
    "quantity_delta" INTEGER NOT NULL,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventory_movements_product_id_idx" ON "inventory_movements"("product_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_order_id_idx" ON "inventory_movements"("order_id");

ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: idempotency_keys (prevent double-deduct on retries)
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "order_id" UUID,
    "response_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_key_key" ON "idempotency_keys"("key");
CREATE INDEX IF NOT EXISTS "idempotency_keys_key_idx" ON "idempotency_keys"("key");
