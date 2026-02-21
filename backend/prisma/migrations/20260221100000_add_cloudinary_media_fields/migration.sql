-- AlterTable
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "cloudinary_public_id" TEXT,
ADD COLUMN IF NOT EXISTS "cloudinary_secure_url" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'product';

-- CreateIndex (if not exists - PostgreSQL doesn't support IF NOT EXISTS for indexes in older versions)
CREATE INDEX IF NOT EXISTS "media_source_idx" ON "media"("source");
CREATE INDEX IF NOT EXISTS "media_cloudinary_public_id_idx" ON "media"("cloudinary_public_id");
