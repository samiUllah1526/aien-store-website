-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" "review_status" NOT NULL DEFAULT 'approved',
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "admin_reply" TEXT,
    "admin_reply_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_reviews_product_id_status_idx" ON "product_reviews"("product_id", "status");

-- CreateIndex
CREATE INDEX "product_reviews_status_idx" ON "product_reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_product_id_user_id_key" ON "product_reviews"("product_id", "user_id");

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed permissions for product reviews (idempotent: skip if already exists)
INSERT INTO "permissions" ("id", "name", "category", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'reviews:read',     'Reviews', NOW(), NOW()),
  (gen_random_uuid(), 'reviews:moderate', 'Reviews', NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;

-- Grant to Admin role
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT r.id, p.id, NOW(), NOW()
FROM "roles" r, "permissions" p
WHERE r.name = 'Admin'
  AND p.name IN ('reviews:read', 'reviews:moderate')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Grant to Super Admin role
INSERT INTO "role_permissions" ("role_id", "permission_id", "created_at", "updated_at")
SELECT r.id, p.id, NOW(), NOW()
FROM "roles" r, "permissions" p
WHERE r.name = 'Super Admin'
  AND p.name IN ('reviews:read', 'reviews:moderate')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
