-- AlterTable: add currency to orders (single currency per order)
-- AlterTable
ALTER TABLE "orders" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'PKR';
