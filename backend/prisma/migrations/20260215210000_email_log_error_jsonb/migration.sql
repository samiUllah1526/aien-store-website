-- AlterTable: change error_message (text) to error (jsonb), preserving existing data
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "error" JSONB;

-- Migrate existing error_message to error as JSON object
UPDATE "email_logs" SET "error" = jsonb_build_object('message', "error_message") WHERE "error_message" IS NOT NULL;

-- Drop old column
ALTER TABLE "email_logs" DROP COLUMN IF EXISTS "error_message";
