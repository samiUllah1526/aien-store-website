-- AlterTable: add upload_error JSONB to media (records failed uploads with message, purpose, context)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "upload_error" JSONB;
