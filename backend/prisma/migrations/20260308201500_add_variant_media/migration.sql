-- Create table for variant-level media attachments
CREATE TABLE "product_variant_media" (
    "variant_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variant_media_pkey" PRIMARY KEY ("variant_id","media_id")
);

-- Supporting index for ordered reads per variant
CREATE INDEX "product_variant_media_variant_id_sort_order_idx" ON "product_variant_media"("variant_id", "sort_order");

-- Foreign keys
ALTER TABLE "product_variant_media"
ADD CONSTRAINT "product_variant_media_variant_id_fkey"
FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_variant_media"
ADD CONSTRAINT "product_variant_media_media_id_fkey"
FOREIGN KEY ("media_id") REFERENCES "media"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
