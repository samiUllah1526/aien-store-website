-- CreateTable
CREATE TABLE "product_review_media" (
    "review_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_review_media_pkey" PRIMARY KEY ("review_id","media_id")
);

-- CreateIndex
CREATE INDEX "product_review_media_review_id_sort_order_idx" ON "product_review_media"("review_id", "sort_order");

-- AddForeignKey
ALTER TABLE "product_review_media" ADD CONSTRAINT "product_review_media_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_media" ADD CONSTRAINT "product_review_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
