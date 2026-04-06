-- CreateEnum
CREATE TYPE "sales_campaign_type" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "sales_campaign_status" AS ENUM ('DRAFT', 'SCHEDULED', 'PAUSED');

-- CreateEnum
CREATE TYPE "sales_campaign_scope" AS ENUM ('ALL_PRODUCTS', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "campaign_id" UUID,
ADD COLUMN     "original_unit_cents" INTEGER;

-- AlterTable
ALTER TABLE "product_variant_media" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sales_campaigns" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "sales_campaign_type" NOT NULL,
    "value" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "sales_campaign_status" NOT NULL DEFAULT 'DRAFT',
    "apply_to" "sales_campaign_scope" NOT NULL DEFAULT 'SPECIFIC_PRODUCTS',
    "badge_text" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sales_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_campaign_products" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "override_value" INTEGER,

    CONSTRAINT "sales_campaign_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_campaign_categories" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "sales_campaign_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_campaigns_slug_key" ON "sales_campaigns"("slug");

-- CreateIndex
CREATE INDEX "sales_campaigns_status_starts_at_ends_at_idx" ON "sales_campaigns"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "sales_campaigns_deleted_at_idx" ON "sales_campaigns"("deleted_at");

-- CreateIndex
CREATE INDEX "sales_campaign_products_product_id_idx" ON "sales_campaign_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_campaign_products_campaign_id_product_id_key" ON "sales_campaign_products"("campaign_id", "product_id");

-- CreateIndex
CREATE INDEX "sales_campaign_categories_category_id_idx" ON "sales_campaign_categories"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_campaign_categories_campaign_id_category_id_key" ON "sales_campaign_categories"("campaign_id", "category_id");

-- AddForeignKey
ALTER TABLE "sales_campaigns" ADD CONSTRAINT "sales_campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_campaign_products" ADD CONSTRAINT "sales_campaign_products_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "sales_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_campaign_products" ADD CONSTRAINT "sales_campaign_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_campaign_categories" ADD CONSTRAINT "sales_campaign_categories_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "sales_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_campaign_categories" ADD CONSTRAINT "sales_campaign_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed permissions for sales campaigns (idempotent: skip if already exists)
INSERT INTO "permissions" ("id", "name", "category", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'sales-campaigns:read',  'Promotions', NOW(), NOW()),
  (gen_random_uuid(), 'sales-campaigns:write', 'Promotions', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Grant to Admin role (all permissions except superadmin:manage and deploy:website)
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT r.id, p.id, NOW(), NOW()
FROM "roles" r, "permissions" p
WHERE r.name = 'Admin'
  AND p.name IN ('sales-campaigns:read', 'sales-campaigns:write')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Grant to Super Admin role
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT r.id, p.id, NOW(), NOW()
FROM "roles" r, "permissions" p
WHERE r.name = 'Super Admin'
  AND p.name IN ('sales-campaigns:read', 'sales-campaigns:write')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
