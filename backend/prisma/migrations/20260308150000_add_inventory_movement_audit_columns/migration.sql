-- Ensure inventory_movements has audit columns (stock_after, performed_by_user_id).
-- Safe to run if columns already exist (e.g. from 0_init).
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "performed_by_user_id" UUID;
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "stock_after" INTEGER;

-- Add FK for performed_by_user_id only if the constraint does not exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'inventory_movements' AND constraint_name = 'inventory_movements_performed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "inventory_movements_performed_by_user_id_fkey"
      FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
