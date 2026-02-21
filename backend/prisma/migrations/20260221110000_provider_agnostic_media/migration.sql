-- Provider-agnostic media schema: replace Cloudinary-specific columns with generic storage fields.

-- Add new columns
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "storage_provider" TEXT DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS "storage_key" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_url" TEXT;

-- Migrate existing Cloudinary data (if cloudinary columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media' AND column_name = 'cloudinary_public_id'
  ) THEN
    UPDATE "media"
    SET
      "storage_provider" = 'cloudinary',
      "storage_key" = "cloudinary_public_id",
      "delivery_url" = "cloudinary_secure_url"
    WHERE "cloudinary_public_id" IS NOT NULL;
  END IF;
END $$;

-- Drop old Cloudinary-specific columns and indexes
DROP INDEX IF EXISTS "media_cloudinary_public_id_idx";
ALTER TABLE "media" DROP COLUMN IF EXISTS "cloudinary_public_id";
ALTER TABLE "media" DROP COLUMN IF EXISTS "cloudinary_secure_url";

-- Create new indexes
CREATE INDEX IF NOT EXISTS "media_storage_provider_idx" ON "media"("storage_provider");
CREATE INDEX IF NOT EXISTS "media_storage_key_idx" ON "media"("storage_key");
