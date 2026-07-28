-- AlterTable
ALTER TABLE "categories" ADD COLUMN "size_guide_media_id" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "primary_category_id" UUID;
ALTER TABLE "products" ADD COLUMN "size_guide_media_id" UUID;

-- CreateIndex
CREATE INDEX "products_primary_category_id_idx" ON "products"("primary_category_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_size_guide_media_id_fkey" FOREIGN KEY ("size_guide_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_primary_category_id_fkey" FOREIGN KEY ("primary_category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_size_guide_media_id_fkey" FOREIGN KEY ("size_guide_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill primary category: earliest product_categories.created_at per product
UPDATE "products" p
SET "primary_category_id" = sub.category_id
FROM (
  SELECT DISTINCT ON (pc.product_id)
    pc.product_id,
    pc.category_id
  FROM "product_categories" pc
  ORDER BY pc.product_id, pc.created_at ASC
) AS sub
WHERE p.id = sub.product_id
  AND p.primary_category_id IS NULL;
