-- Introduce product_variants and make orders/inventory variant-aware.
-- Breaking change accepted by product owner; migration still preserves existing data.

CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "color" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "sku" TEXT,
  "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "price_override_cents" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_product_id_color_size_key"
  ON "product_variants"("product_id", "color", "size");
CREATE UNIQUE INDEX IF NOT EXISTS "product_variants_sku_key"
  ON "product_variants"("sku");
CREATE INDEX IF NOT EXISTS "product_variants_product_id_idx"
  ON "product_variants"("product_id");
CREATE INDEX IF NOT EXISTS "product_variants_product_id_is_active_idx"
  ON "product_variants"("product_id", "is_active");

ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill variants from existing products.
-- Strategy:
-- 1) If product has legacy sizes array, create one variant per size.
-- 2) Keep stock only on the first generated variant to avoid accidental stock multiplication.
-- 3) If product has no sizes, create a single "Default / One size" variant.
WITH expanded_sizes AS (
  SELECT
    p.id AS product_id,
    p.stock_quantity AS stock_quantity,
    NULLIF(TRIM(value::text, '"'), '') AS size,
    ROW_NUMBER() OVER (
      PARTITION BY p.id
      ORDER BY NULLIF(TRIM(value::text, '"'), '') ASC NULLS LAST
    ) AS rn
  FROM "products" p
  LEFT JOIN LATERAL jsonb_array_elements_text(COALESCE(p.sizes::jsonb, '[]'::jsonb)) AS value ON true
),
normalized_sizes AS (
  SELECT
    product_id,
    stock_quantity,
    CASE
      WHEN size IS NULL OR size = '' THEN 'One size'
      ELSE size
    END AS size,
    rn
  FROM expanded_sizes
),
products_without_sizes AS (
  SELECT p.id AS product_id, p.stock_quantity
  FROM "products" p
  WHERE NOT EXISTS (
    SELECT 1
    FROM normalized_sizes ns
    WHERE ns.product_id = p.id
  )
)
INSERT INTO "product_variants" (
  "id",
  "product_id",
  "color",
  "size",
  "stock_quantity",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  ns.product_id,
  'Default',
  ns.size,
  CASE WHEN ns.rn = 1 THEN COALESCE(ns.stock_quantity, 0) ELSE 0 END,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM normalized_sizes ns
UNION ALL
SELECT
  gen_random_uuid(),
  pws.product_id,
  'Default',
  'One size',
  COALESCE(pws.stock_quantity, 0),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM products_without_sizes pws
ON CONFLICT ("product_id", "color", "size") DO NOTHING;

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "size" TEXT,
  ADD COLUMN IF NOT EXISTS "variant_id" UUID,
  ADD COLUMN IF NOT EXISTS "color" TEXT;

ALTER TABLE "inventory_movements"
  ADD COLUMN IF NOT EXISTS "variant_id" UUID;

-- Best-effort backfill for historical rows.
UPDATE "order_items" oi
SET
  "variant_id" = pv.id,
  "color" = COALESCE(oi."color", pv."color"),
  "size" = COALESCE(oi."size", pv."size")
FROM "product_variants" pv
WHERE
  oi."variant_id" IS NULL
  AND pv."product_id" = oi."product_id"
  AND (
    (oi."size" IS NOT NULL AND pv."size" = oi."size")
    OR (oi."size" IS NULL)
  );

UPDATE "inventory_movements" im
SET "variant_id" = pv.id
FROM "product_variants" pv
WHERE
  im."variant_id" IS NULL
  AND im."product_id" = pv."product_id";

-- Enforce NOT NULL only after backfill.
UPDATE "order_items" oi
SET "variant_id" = (
  SELECT pv.id
  FROM "product_variants" pv
  WHERE pv."product_id" = oi."product_id"
  ORDER BY pv."created_at" ASC
  LIMIT 1
)
WHERE oi."variant_id" IS NULL;

ALTER TABLE "order_items"
  ALTER COLUMN "variant_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "order_items_variant_id_idx"
  ON "order_items"("variant_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_variant_id_idx"
  ON "inventory_movements"("variant_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_variant_id_fkey'
  ) THEN
    ALTER TABLE "order_items"
      ADD CONSTRAINT "order_items_variant_id_fkey"
      FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_movements_variant_id_fkey'
  ) THEN
    ALTER TABLE "inventory_movements"
      ADD CONSTRAINT "inventory_movements_variant_id_fkey"
      FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
