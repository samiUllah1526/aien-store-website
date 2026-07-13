-- CreateEnum
CREATE TYPE "review_source" AS ENUM ('customer', 'admin');

-- AlterTable: allow admin-created reviews (no customer user / email) + provenance
ALTER TABLE "product_reviews"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ALTER COLUMN "author_email" DROP NOT NULL,
  ADD COLUMN "source" "review_source" NOT NULL DEFAULT 'customer',
  ADD COLUMN "created_by_user_id" UUID;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
