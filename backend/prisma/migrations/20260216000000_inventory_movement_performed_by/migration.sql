-- AlterTable: add performed_by_user_id to inventory_movements (audit who made adjustment)
ALTER TABLE "inventory_movements" ADD COLUMN IF NOT EXISTS "performed_by_user_id" UUID;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performed_by_user_id_fkey"
  FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
