-- Legacy pre-variant migration.
-- Keep this migration before 20260308190000_add_product_variants so fresh databases
-- have order_items.size available for historical backfill logic.
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "size" TEXT;
