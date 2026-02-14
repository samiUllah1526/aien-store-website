-- CreateTable: product_categories (many-to-many Product <-> Category)
CREATE TABLE "product_categories" (
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id","category_id")
);

-- AddForeignKey (product_categories -> products)
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (product_categories -> categories)
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing product.category_id into product_categories
INSERT INTO "product_categories" ("product_id", "category_id")
SELECT "id", "category_id" FROM "products" WHERE "category_id" IS NOT NULL;

-- Drop column category_id from products
ALTER TABLE "products" DROP COLUMN IF EXISTS "category_id";
