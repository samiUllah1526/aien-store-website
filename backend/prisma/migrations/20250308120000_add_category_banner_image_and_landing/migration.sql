-- AlterTable: add banner image URL and landing page fields to categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "banner_image_url" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "show_on_landing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "landing_order" INTEGER;
