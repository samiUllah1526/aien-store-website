-- AlterTable
ALTER TABLE "product_reviews" ADD COLUMN "featured_on_homepage" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "product_reviews_featured_on_homepage_status_idx" ON "product_reviews"("featured_on_homepage", "status");
