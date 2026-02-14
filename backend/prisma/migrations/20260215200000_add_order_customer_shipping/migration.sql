-- AlterTable: add customer/shipping snapshot to orders
ALTER TABLE "orders" ADD COLUMN "customer_name" TEXT;
ALTER TABLE "orders" ADD COLUMN "customer_phone" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_country" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_address_line1" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_address_line2" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_city" TEXT;
ALTER TABLE "orders" ADD COLUMN "shipping_postal_code" TEXT;
